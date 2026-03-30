return {
  defaultToken: "",
  tokenPostfix: ".ram",

  readop_keywords: ["load", "add", "sub", "mul", "div", "write"],
  writeop_keywords: ["store", "read"],
  jump_keywords: ["jump", "jgtz", "jzero"],

  digits: /\d+/,

  tokenizer: {
    root: [
      [/\s*\w*:/, "tag"], // "annotation"

      // keywords
      [
        /[a-zA-Z_$][\w$]*/,
        {
          cases: {
            "@readop_keywords": { token: "keyword.$0", next: "after_readop_keyword" },
            "@writeop_keywords": { token: "keyword.$0", next: "after_writeop_keyword" },
            "@jump_keywords": { token: "keyword.$0", next: "after_jump_keyword" },
            "@default": "invalid",
          },
        },
      ],
      { include: "@whitespace" },
      [/(@digits)/, "number"],
    ],

    whitespace: [
      [/[ \t]+/, ""],
      [/$/, "", "@popall"],
      [/;.*$/, "comment", "@popall"],
    ],

    after_writeop_keyword: [{ include: "@whitespace" }, [/\d+/, "number", "root"], [/\*\d+/, "number", "root"], [/.*/, "invalid", "root"]],
    after_readop_keyword: [[/=\d+/, "number", "root"], { include: "@after_writeop_keyword" }],
    after_jump_keyword: [{ include: "@whitespace" }, [/\s*[a-zA-Z_]+/, "tag", "root"], [/.*/, "invalid", "root"]],
  },
};
