(identifier) @variable
(name_literal) @variable
(hat_word) @keyword
((hat_word) @type.builtin
 (#match? @type.builtin "^(number|string|bool|nil|any|t|c|error|Self)$"))
((hat_word) @boolean
 (#match? @boolean "^(true|false)$"))
((hat_word) @operator
 (#match? @operator "^(and|or|is|fits|as)$"))
((hat_word) @variable.special
 (#match? @variable.special "^(this|it|index|self|super|L)$"))
((hat_word) @function
 (#match? @function "^(typeof|id|width|autowidth|prolog|prologue|pre|premain|first|main|last|epilog|epilogue)$"))
(scoped_name) @variable.special
; The comment prefix supplies a muted fallback in uncustomized themes.
; This is a highlight only, not a comment scope in overrides.scm.
(hat_suffix) @comment.lhat_hat
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
(member_reference ["." "?."] @operator)
(qualified_name "." @operator)
(postfix_expression ["." "?." "?"] @operator)
(union_type ["|" "&"] @operator)
(optional_type "?" @operator)
(type_annotation ":" @punctuation.delimiter)
(signature ["," ":"] @punctuation.delimiter)
(callable_type ";" @punctuation.delimiter)
(enum_member "=" @operator)
(enum_body "," @punctuation.delimiter)
(error_body "," @punctuation.delimiter)
(binding_targets "," @punctuation.delimiter)
(value_list "," @punctuation.delimiter)
(control_value ";" @punctuation.delimiter)
(delimiter) @punctuation.delimiter
["{" "}" "[" "]" "(" ")" "?(" "?["] @punctuation.bracket
