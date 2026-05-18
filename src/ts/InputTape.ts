import { ContiguousArray } from "./BigArray";
import { bigintMax, bigintParse } from "./BigIntUtils";
import { BigScrollList } from "./BigScrollList";
import { InputDataSettings as InputDataConfig, Sequence } from "./Chart";
import { t } from "./Localization";
import { randomBigint } from "./Memory";
import { select, Templates, useTemplate } from "./Nodes";
import { InputTapeUnderflowBehavior } from "./Settings";
import { assertNever, unreachable } from "./Util";

export abstract class InputTape {
  abstract peek(): bigint | undefined;
  abstract read(quiet: boolean): bigint | undefined;
  readOrDefault(quiet: boolean, config: InputTapeUnderflowBehavior): bigint {
    const peek = this.peek();

    // Report an error before incrementing the currentIndex
    if (peek === undefined) {
      if (config === "error") {
        throw new Error(`tried to read from input tape, but there is no more cells to read`);
      }
    }

    const value = this.read(quiet);
    if (value === undefined) {
      if (config === "error") {
        // TODO: display runtime error in status pane
        unreachable(`tried to read from input tape, but there is no more cells to read`);
      } else if (config === "zero") {
        return 0n;
      } else if (config === "random") {
        return randomBigint();
      } else {
        assertNever(config);
      }
    } else {
      return value;
    }
  }
  abstract reset(): void;
  clearAndReset(): void {
    this.reset();
  }
  abstract asString(maxCount?: number): string;
  refreshActiveCell(): void {}
}

export function valuesFromString(text: string) {
  text.trim();
  if (text === "") return [];

  const textValues = text.split(/[\t\f\v ,]+/);
  const values = textValues
    .map((textValue): bigint | undefined => {
      if (textValue === "") {
        return undefined;
      }
      try {
        const value = BigInt(textValue);
        return value;
      } catch (e) {
        console.warn(`Could not convert string '${textValue}' to bigint: `, e);
        return undefined;
      }
    })
    .filter((x) => x !== undefined);
  return values;
}

export class InputTapeArray extends InputTape {
  protected values = new ContiguousArray<bigint>();
  protected currentIndex: bigint = 0n;

  peek() {
    return this.values.get(this.currentIndex);
  }

  read(_quiet: boolean) {
    const value = this.values.get(this.currentIndex);
    this.currentIndex++;
    return value;
  }

  reset() {
    this.currentIndex = 0n;
    this.refreshActiveCell();
  }

  override clearAndReset() {
    this.values = new ContiguousArray();
    this.reset();
  }

  asString(maxCount?: number): string {
    if (maxCount !== undefined) {
      return this.values.asArray().slice(0, maxCount).join(",");
    } else {
      return this.values.asArray().join(",");
    }
  }

  static fromString(text: string): InputTapeArray {
    const values = valuesFromString(text);
    return InputTapeArray.fromValues(values);
  }

  static fromValues(values: bigint[]): InputTapeArray {
    const tape = new InputTapeArray();
    // tape.values.push(...values); <-- this does not work for a very large amount of values
    for (const value of values) {
      tape.values.push(value);
    }
    return tape;
  }
}

export class InputTapeArrayDOM extends InputTapeArray {
  private scrollList: BigScrollList | null = null;

  // Minimum amount of cells to display on tape.
  static readonly MIN_ELEMENTS_ON_VISIBLE_TAPE = 3n as const;

  // Amount of "empty" tape cells displayed after the end of the input tape.
  // 0n => no empty cells; it is impossible to extend the tape beyond the size that it already is.
  // 1n => one empty cell; if focused, pressing Tab will skip to the next section instead of the next cell (because there is no 2nd empty cell)
  // 2n => two empty cells is the bare minimum; it fixes the Tab issue partially, but sometimes it can still happen
  // 3n => three empty cells is the recommended minimum; it fixes the Tab issue fully
  static readonly EXTRA_ELEMENTS_ON_VISIBLE_TAPE = 3n as const;

  override read(quiet: boolean) {
    const value = super.read(quiet);
    if (!quiet) {
      this.refreshActiveCell();
    }
    return value;
  }

  override refreshActiveCell() {
    if (this.scrollList !== null) {
      this.scrollList.iterActive((listItem, _index) => {
        const cell = select(listItem, "#input-tape-scroll-list-cell");
        cell.classList.remove("active");
      });
      const listItem = this.scrollList.selectListItem(this.currentIndex);
      if (listItem !== null) {
        const cell = select(listItem, "#input-tape-scroll-list-cell");
        if (cell !== null) {
          cell.classList.add("active");
        }
      }
    }
  }

  updateListLength() {
    if (this.scrollList !== null) {
      this.scrollList.setItemCount(
        bigintMax(
          this.values.length() + InputTapeArrayDOM.EXTRA_ELEMENTS_ON_VISIBLE_TAPE,
          InputTapeArrayDOM.MIN_ELEMENTS_ON_VISIBLE_TAPE
        )
      );
    }
    if (this.lengthElement !== null) {
      this.lengthElement.textContent = `${this.values.length()}`;
    }
  }

  private updateCellElement(cell: Element, value: bigint | undefined, active: boolean) {
    const valueInput = select<HTMLInputElement>(cell, "#value");
    if (value === undefined) {
      valueInput.value = "";
      valueInput.placeholder = t.inputTape.cellEmpty;
      cell.classList.add("empty");
    } else {
      valueInput.value = `${value}`;
      valueInput.placeholder = `${value}`;
      cell.classList.remove("empty");
    }

    if (active) {
      cell.classList.add("active");
    } else {
      cell.classList.remove("active");
    }
    valueInput.classList.remove("invalid");
  }

  refreshExistingCells() {
    if (this.scrollList !== null) {
      this.scrollList.iterActive((listItem, index) => {
        const cell = select(listItem, "#input-tape-scroll-list-cell");
        this.updateCellElement(cell, this.values.get(index), index === this.currentIndex);
      });
    }
  }

  static fromStringDOM(
    text: string,
    hostElement: HTMLElement | null,
    lengthElement: Element | null
  ): InputTapeArrayDOM {
    const values = valuesFromString(text);
    return InputTapeArrayDOM.fromValuesDOM(values, hostElement, lengthElement);
  }

  static fromValuesDOM(
    values: bigint[],
    hostElement: HTMLElement | null,
    lengthElement: Element | null
  ): InputTapeArrayDOM {
    const tape = new InputTapeArrayDOM(hostElement, lengthElement);
    // tape.values.push(...values); <-- this does not work for a very large amount of values
    for (const value of values) {
      tape.values.push(value);
    }
    tape.updateListLength();
    tape.refreshExistingCells();
    return tape;
  }

  constructor(hostElement: HTMLElement | null, public lengthElement: Element | null) {
    super();
    if (hostElement !== null) {
      this.scrollList = new BigScrollList(
        hostElement,
        "horizontal",
        0n, // initial element count
        120, // item size
        (index) => {
          const f = useTemplate(Templates.inputTapeCell);

          const cell = select(f, "#input-tape-scroll-list-cell");
          const indexSpan = select(f, "#index");
          const valueInput = select<HTMLInputElement>(f, "#value");

          if (index % 2n === 0n) {
            cell.classList.add("even");
          } else {
            cell.classList.add("odd");
          }
          indexSpan.textContent = `${index + 1n}`;

          const value = this.values.get(index);
          this.updateCellElement(cell, value, index === this.currentIndex);

          const updateValue = (confirmed: boolean) => {
            const valueText = valueInput.value;
            const value = bigintParse(valueText);
            // console.log(valueInput);
            // console.log(`Changed input tape cell #${index} to '${valueText}' ${value}`, confirmed);
            if (valueText === "") {
              // Empty value
              valueInput.classList.remove("invalid");

              // Remove from tape if this is the last element
              if (index === this.values.length() - 1n) {
                this.values.pop();
                this.updateCellElement(cell, undefined, index === this.currentIndex);
                this.updateListLength();
              }
            } else if (value === undefined) {
              // Invalid text inputted
              valueInput.classList.add("invalid");
            } else {
              // Valid value inputted
              valueInput.classList.remove("invalid");

              if (confirmed) {
                // Set the value in the actual tape array
                if (index >= this.values.length()) {
                  this.values.setWithFill(index, value, 0n);
                  this.refreshExistingCells();
                  this.scrollList?.updateVisibleElements();
                  this.updateListLength();
                } else {
                  this.values.update(index, value);
                }

                // Update the placeholder
                valueInput.placeholder = `${value}`;
                cell.classList.remove("empty");
              }
            }
          };

          valueInput.addEventListener("change", () => updateValue(true));
          valueInput.addEventListener("keyup", () => updateValue(false));
          return f;
        },
        hostElement.parentElement!.clientWidth
      );

      const resizeObserver = new ResizeObserver(() => {
        if (this.scrollList !== null) {
          this.scrollList.setContainerAvailableSize(this.scrollList.hostElement.parentElement!.clientWidth);
        }
      });
      resizeObserver.observe(hostElement);
    }

    this.updateListLength();
  }
}

export class InputTapeGenerator extends InputTape {
  private activeGenerator: Generator<bigint, void, void>;
  private nextValue: null | bigint | undefined = null;

  private getNextValueFromGenerator(): bigint | undefined {
    if (this.nextValue === null) {
      const it = this.activeGenerator.next();
      if (it.done) {
        this.nextValue = undefined;
      } else {
        this.nextValue = it.value;
      }
      return this.nextValue;
    } else {
      return this.nextValue;
    }
  }

  peek(): bigint | undefined {
    return this.getNextValueFromGenerator();
  }

  read(quiet: boolean): bigint | undefined {
    const nextValue = this.getNextValueFromGenerator();
    if (this.nextValue !== undefined) {
      this.nextValue = null;
    }
    return nextValue;
  }

  reset(): void {
    this.activeGenerator = this.createGenerator();
  }

  asString(maxCount: number = 10000): string {
    const newGenerator = this.createGenerator();
    return newGenerator.take(maxCount).toArray().join(",");
  }

  constructor(private createGenerator: () => Generator<bigint, void, void>) {
    super();
    this.activeGenerator = this.createGenerator();
    const a = function* (a: number, b: number) {
      yield 1n;
      yield 2n;
      yield 3n;
      return;
    };
  }
}

function genConst(num: bigint, length: bigint | undefined) {
  return function* () {
    for (let i = 0; length === undefined || i < length; i++) {
      yield num;
    }
  };
}

function genRange(from: bigint, to: bigint | undefined, step: bigint = 1n) {
  if (step > 0n) {
    return function* () {
      for (let i = from; to === undefined || i <= to; i += step) {
        yield i;
      }
    };
  } else {
    return function* () {
      for (let i = from; to === undefined || i >= to; i += step) {
        yield i;
      }
    };
  }
}

function genArithmeticSeq(from: bigint, step: bigint, length: bigint | undefined) {
  return function* () {
    let value = from;
    for (let i = 0; length === undefined || i < length; i++) {
      yield value;
      value += step;
    }
  };
}

function genGeometricSeq(from: bigint, step: bigint, length: bigint | undefined) {
  return function* () {
    let value = from;
    for (let i = 0; length === undefined || i < length; i++) {
      yield value;
      value *= step;
    }
  };
}

function genRandom(minRandValue: bigint, maxRandValue: bigint, length: bigint | undefined) {
  return function* () {
    for (let i = 0; length === undefined || i < length; i++) {
      yield minRandValue + randomBigint(Number(maxRandValue - minRandValue));
    }
  };
}

function isPrime(i: bigint) {
  for (let j = 2n, sqrt = Math.sqrt(Number(i)); j <= sqrt; j++) {
    if (i % j === 0n) {
      return false;
    }
  }
  return i > 1;
}

function genPrime(length: bigint | undefined) {
  return function* () {
    let x = 2n;
    for (let i = 0; length === undefined || i < length; i++) {
      while (!isPrime(x)) {
        x++;
      }
      yield x;
      x++;
    }
  };
}

function genComposite(length: bigint | undefined) {
  return function* () {
    let x = 2n;
    for (let i = 0; length === undefined || i < length; i++) {
      while (isPrime(x)) {
        x++;
      }
      yield x;
      x++;
    }
  };
}

function genCustom(tape: bigint[], length: bigint | undefined) {
  return function* () {
    for (let i = 0; length === undefined || i < length; i++) {
      if (tape[i] === undefined) {
        break;
      }
      yield tape[i];
    }
  };
}

export function createSimulationSequenceGen(sequence: Sequence, length: bigint): () => Generator<bigint, void, void> {
  if (sequence.type === "natural") {
    return genRange(0n, length);
  } else if (sequence.type === "positive") {
    return genRange(1n, length);
  } else if (sequence.type === "negative") {
    return genRange(-1n, -length, -1n);
  } else if (sequence.type === "constant") {
    return genConst(sequence.value, length);
  } else if (sequence.type === "prime") {
    return genPrime(length);
  } else if (sequence.type === "composite") {
    return genComposite(length);
  } else if (sequence.type === "arithmetic") {
    return genArithmeticSeq(sequence.from, sequence.step, length);
  } else if (sequence.type === "geometric") {
    return genGeometricSeq(sequence.from, sequence.step, length);
  } else if (sequence.type === "random") {
    return genRandom(sequence.minInclusive, sequence.maxExclusive, length);
  } else if (sequence.type === "custom") {
    return genCustom(sequence.tape, length);
  } else {
    assertNever(sequence.type);
  }
}

export function createSimulationInputTape(x: bigint, inputDataConfig: InputDataConfig): InputTape {
  if (inputDataConfig.simulationType === "valueVariable") {
    const valueType = inputDataConfig.valueType;
    if (valueType === "oneValueSingle") {
      return new InputTapeGenerator(genConst(x, 1n));
    } else if (valueType === "oneValueEndless") {
      return new InputTapeGenerator(genConst(x, undefined));
    } else {
      assertNever(valueType);
    }
  } else if (inputDataConfig.simulationType === "lengthVariable") {
    const sequence = inputDataConfig.sequence;
    const genCreator = createSimulationSequenceGen(sequence, x);
    return new InputTapeGenerator(genCreator);
  } else if (inputDataConfig.simulationType === "sizedArray") {
    const sequence = inputDataConfig.sequence;
    const innerGenCreator = createSimulationSequenceGen(sequence, x);
    const genCreator = (): Generator<bigint, void, unknown> => {
      const innerGen = innerGenCreator();
      return (function* () {
        yield x;
        let a = innerGen.next();
        while (!a.done) {
          yield a.value;
          a = innerGen.next();
        }
      })();
    };
    return new InputTapeGenerator(genCreator);
  } else if (inputDataConfig.simulationType === "customData") {
    const tapeIndex = Number(x) - 1; // x starts at 1, but the index starts at 0
    const values = inputDataConfig.customData[tapeIndex];
    if (values !== undefined) {
      return InputTapeArray.fromValues(values);
    } else {
      return InputTapeArray.fromValues([]);
    }
  } else {
    assertNever(inputDataConfig.simulationType);
  }
}
