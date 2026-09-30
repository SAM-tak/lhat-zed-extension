(identifier) @variable
(name_literal) @variable
(hat_identifier) @keyword
((hat_identifier) @type.builtin
 (#match? @type.builtin "^(number|string|bool|nil|any|t|c|error|Self)\\^+$"))
((hat_identifier) @boolean
 (#match? @boolean "^(true|false)\\^+$"))
((hat_identifier) @operator
 (#match? @operator "^(and|or|is|fits|as)\\^+$"))
((hat_identifier) @variable.special
 (#match? @variable.special "^(this|it|index|self|super|L)\\^+$"))
((hat_identifier) @function
 (#match? @function "^(typeof|id|width|autowidth|prolog|prologue|pre|premain|first|main|last|epilog|epilogue)\\^+$"))
(scoped_identifier) @variable.special
(annotation) @attribute
(number) @number
[(string) (raw_string) (line_string)] @string
(interpolated_content) @string
(format_specifier) @string.special
(interpolated_string ["$\"" "\""] @string)
[(escape_sequence) (interpolation_escape)] @string.escape
(interpolation ["{" "}"] @punctuation.special)
[(line_comment) (block_comment)] @comment
(operator) @operator
(numeric_member ["." "?."] @operator)
(delimiter) @punctuation.delimiter
["{" "}" "[" "]" "(" ")" "?(" "?["] @punctuation.bracket
