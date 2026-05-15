import { BigScrollList } from "./BigScrollList";
import { Nodes, Templates, useTemplate } from "./Nodes";

/// Testing area
export function testingArea() {
  const bigScrollList = new BigScrollList(
    Nodes.bigScrollListTest,
    "horizontal",
    2000000n,
    90, // item size
    (index) => {
      const f = useTemplate(Templates.bigScrollListTestRow);
      f.querySelector("#number")!.textContent = `${index};`;
      return f;
    },
    800
  );
}
