(braced_group "{" @open "}" @close)
[(table_body "{" @open "}" @close)
 (enum_body "{" @open "}" @close)
 (error_body "{" @open "}" @close)]
(bracketed_group ["[" "?["] @open "]" @close)
(parenthesized_group ["(" "?("] @open ")" @close)
(interpolation "{" @open "}" @close)
(string "\"" @open "\"" @close)
(interpolated_string "$\"" @open "\"" @close)
