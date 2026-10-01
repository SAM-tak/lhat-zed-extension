; One item per binding statement. Multiple targets share the same value range
; and appear together, rather than producing overlapping duplicate parents.
(binding_declaration
  kind: (binding_keyword) @context
  targets: (binding_targets
    . (binding_target name: (_) @name)
    ("," @context (binding_target name: (_) @name))* .)) @item

(module_declaration
  (module_keyword) @context
  name: (_) @name) @item

(enum_declaration
  (enum_keyword) @context
  name: (_) @name) @item
(enum_member name: (_) @name) @item

(error_declaration
  (error_keyword) @context
  name: (_) @name) @item
(error_kind name: (_) @name) @item

; Only actual brace entries, never a bare `a = b` comparison at the file root.
(table_literal body: (table_body (table_entry name: (_) @name) @item))
(definition_value body: (table_body (table_entry name: (_) @name) @item))
(definition_value body: (table_body
  (self_fields body: (table_body (table_entry name: (_) @name) @item))))
(error_kind (table_body (table_entry name: (_) @name) @item))

; A named type alias contributes fields, but an inline parameter/target type
; annotation does not create a second set of fields in the outline.
(binding_declaration value: (value_list
  (type_literal body: (table_body (table_entry name: (_) @name) @item))))
(binding_declaration value: (value_list
  (type_literal body: (table_body
    (self_fields body: (table_body (table_entry name: (_) @name) @item))))))
(table_entry value: (type_literal body: (table_body
  (table_entry name: (_) @name) @item)))
