// Editor grammar: declarations and their values have structural ranges for
// outline navigation. Other statements retain a permissive lexical fallback;
// semantic validation and LTON's restrictions remain the job of lhatls.
const identifier = /[_\p{XID_Start}][_\p{XID_Continue}]*/;
const commaSep1 = rule => seq(rule, repeat(seq(',', rule)));
const keyword = ($, word) => seq(alias(word, $.hat_word), $.hat_suffix);

module.exports = grammar({
  name: 'lhat',
  extras: $ => [/\s/, $.line_comment, $.block_comment],
  // Keep this order synchronized with scanner.c.
  externals: $ => [
    $.block_comment, $._binding_word, $._function_word, $._def_word,
    $._self_word, $._type_word, $._enum_word, $._error_word, $._module_word,
    $._return_word, $._public_word, $._op_word, $._modifier_word,
    $._delegate_word, $._prefix_word, $._binary_word, $._control_word, $._string_guard,
  ],
  rules: {
    // Root entries are needed for LTON. The L^ outline query intentionally
    // ignores them: a plain `a = b` in L^ is a comparison, not a declaration.
    source_file: $ => repeat(choice($._item, $.table_entry)),
    _item: $ => choice($._non_delimiter_item, $.delimiter),
    _non_delimiter_item: $ => choice(
      $._member_name, $.scoped_identifier,
      $.annotation, $.number, $.string, $.raw_string, $.line_string,
      $.interpolated_string, $.braced_group, $.parenthesized_group,
      $.bracketed_group, $.operator, $.numeric_member,
      $.binding_declaration, $.enum_declaration, $.error_declaration,
      $.module_declaration, $.public_declaration, $.return_statement,
      $.member_reference,
    ),
    _name: $ => choice($.identifier, $.name_literal),
    _member_name: $ => choice($._name, $.hat_identifier),
    qualified_name: $ => prec.right(4, seq(choice($._member_name, $.scoped_identifier), repeat(seq('.', $._member_name)))),
    member_reference: $ => prec(4, seq(choice($._member_name, $.scoped_identifier), repeat1(seq(choice('.', '?.'), choice($._member_name, alias(token(prec(2, /[0-9][0-9_]*/)), $.number)))))),

    binding_keyword: $ => keyword($, $._binding_word),
    function_keyword: $ => keyword($, $._function_word),
    definition_keyword: $ => keyword($, $._def_word),
    self_keyword: $ => keyword($, $._self_word),
    type_keyword: $ => keyword($, $._type_word),
    enum_keyword: $ => keyword($, $._enum_word),
    error_keyword: $ => keyword($, $._error_word),
    module_keyword: $ => keyword($, $._module_word),
    return_keyword: $ => keyword($, $._return_word),
    public_keyword: $ => keyword($, $._public_word),
    operator_keyword: $ => keyword($, $._op_word),
    member_modifier: $ => keyword($, $._modifier_word),
    delegate_keyword: $ => keyword($, $._delegate_word),
    prefix_keyword: $ => keyword($, $._prefix_word),
    word_operator: $ => keyword($, $._binary_word),
    control_keyword: $ => keyword($, $._control_word),

    binding_declaration: $ => prec.right(2, seq(
      field('kind', $.binding_keyword), field('targets', $.binding_targets),
      alias(choice('=', ':='), $.operator), field('value', $.value_list),
    )),
    binding_targets: $ => commaSep1($.binding_target),
    binding_target: $ => seq(field('name', $.qualified_name), optional($.type_annotation)),
    public_declaration: $ => seq($.public_keyword, choice($.binding_declaration, $.enum_declaration, $.error_declaration)),
    module_declaration: $ => prec(2, seq($.module_keyword, field('name', $.qualified_name))),
    return_statement: $ => prec.right(1, seq($.return_keyword, optional($.value_list))),
    value_list: $ => prec.right(5, seq($._value, repeat(prec.right(5, seq(',', $._value))))),
    _value: $ => choice($._value_atom, $.binary_expression, $.unary_expression, $.postfix_expression, $.prefix_expression),
    _value_atom: $ => choice(
      $._member_name, $.scoped_identifier, $.number, $.string, $.raw_string,
      $.line_string, $.interpolated_string, $.parenthesized_group,
      $.function_value, $.callable_type, $.definition_value, $.self_fields,
      $.type_literal, $.table_literal, $.control_value,
    ),
    binary_expression: $ => prec.left(1, seq(
      field('left', $._value),
      choice(alias(choice('+', '-', '*', '/', '%', '//', '**', '..', '??', '=', '<', '>',
        '!=', '=/', '≠', '<=', '>=', '≤', '≥', '≦', '≧', '|', '&'), $.operator), $.word_operator),
      field('right', $._value),
    )),
    unary_expression: $ => prec(2, seq(alias(choice('-', '+', '!', '...'), $.operator), $._value)),
    prefix_expression: $ => prec(2, seq($.prefix_keyword, $._value)),
    postfix_expression: $ => prec.left(4, seq($._value, choice(
      $.parenthesized_group, $.bracketed_group,
      seq(choice('.', '?.'), choice($._member_name, alias(token(prec(2, /[0-9][0-9_]*/)), $.number))),
      '?',
    ))),

    // Signature spelling is preserved for display. A t^{...} in a parameter
    // or return type belongs to the header, not to the function's body.
    function_value: $ => seq(field('kind', $.function_keyword), optional(field('signature', $.signature)), field('body', $.braced_group)),
    callable_type: $ => seq($.function_keyword, optional($.signature), ';'),
    control_value: $ => seq($.control_keyword, optional($.signature), choice($.braced_group, ';')),
    signature: $ => repeat1(choice(
      $._member_name, $.scoped_identifier, $.type_literal, $.callable_type,
      $.parenthesized_group, $.bracketed_group, $.number, $.string, $.raw_string,
      $.operator, ',', ':',
    )),
    type_annotation: $ => seq(':', field('type', $._type)),
    _type: $ => choice($.qualified_name, $.type_literal, $.callable_type, $.parenthesized_group, $.union_type, $.optional_type, $.array_type),
    union_type: $ => prec.left(1, seq($._type, choice('|', '&'), $._type)),
    optional_type: $ => prec.left(2, seq($._type, '?')),
    array_type: $ => prec.left(2, seq($._type, '[', ']')),

    definition_value: $ => seq($.definition_keyword, field('body', $.table_body)),
    self_fields: $ => seq($.self_keyword, field('body', $.table_body)),
    type_literal: $ => seq($.type_keyword, field('body', $.table_body)),
    table_literal: $ => field('body', $.table_body),
    table_body: $ => seq('{', repeat(choice($.table_entry, $.computed_entry, $.delegate_entry, $.self_fields, $._item)), '}'),
    table_entry: $ => prec.right(3, seq(
      repeat($.member_modifier), field('name', choice($._member_name, $.operator_name)),
      choice(seq(optional($.type_annotation), alias(choice('=', ':='), $.operator), field('value', $._value)), $.type_annotation),
    )),
    computed_entry: $ => prec(3, seq($.bracketed_group, alias(choice('=', ':='), $.operator), $._value)),
    delegate_entry: $ => seq($.delegate_keyword, $._value),
    operator_name: $ => seq($.operator_keyword, choice($.operator, seq('[', ']'), seq('(', ')'))),

    enum_declaration: $ => seq($.enum_keyword, field('name', $._name), field('body', $.enum_body)),
    enum_body: $ => seq('{', optional(seq(commaSep1($.enum_member), optional(','))), '}'),
    enum_member: $ => seq(field('name', $._name), optional(seq('=', $._value))),
    error_declaration: $ => seq($.error_keyword, field('name', $._name), field('body', $.error_body)),
    error_body: $ => seq('{', optional(seq(commaSep1($.error_kind), optional(','))), '}'),
    error_kind: $ => seq(field('name', $._name), optional($.table_body)),
    identifier: _ => identifier,
    // Keep the suffix as a separate node so themes can dim only the hats.
    // token.immediate preserves the rule that hats must touch the name.
    hat_identifier: $ => prec(1, seq(alias($.identifier, $.hat_word), $.hat_suffix)),
    hat_suffix: _ => token.immediate(/\^+/),
    scoped_identifier: $ => prec(1, seq($.scoped_name, optional($.hat_suffix))),
    scoped_name: _ => token(seq(/\$[\$\^]*/, identifier)),
    annotation: _ => token(seq('@', identifier)),
    name_literal: _ => token(seq('`', repeat1(choice('``', /[^`\r\n]/)), '`')),
    number: _ => token(choice(
      /0[xX][0-9a-fA-F_]+/, /0[bB][01_]+/, /0[oO][0-7_]+/,
      /[0-9][0-9_]*\.[0-9][0-9_]*([eE][+-]?[0-9]+)?/,
      /[0-9][0-9_]*[eE][+-]?[0-9]+/, /[0-9][0-9_]*/,
    )),
    // The integer after an accessor is a key: a.0.0 is not a float.
    numeric_member: $ => prec(1, seq(choice('.', '?.'), alias(token(prec(2, /[0-9][0-9_]*/)), $.number))),
    string: $ => seq('"', repeat(choice($.string_content, $.escape_sequence, $._string_guard)), '"'),
    string_content: _ => token.immediate(prec(1, /[^"\\]+/)),
    escape_sequence: _ => token.immediate(seq('\\', choice(
      /[nrt0\\"]/, /x[0-9a-fA-F]{2}/, /u\{[0-9a-fA-F]+\}/, /\r?\n/,
    ))),
    raw_string: _ => token(seq("'", repeat(choice("''", /[^']/)), "'")),
    line_string: _ => token(prec(2, /"""[^\r\n]*/)),
    interpolated_string: $ => seq('$"', repeat(choice(
      $.interpolated_content, $.interpolation_escape, $.escape_sequence, $.interpolation, $._string_guard,
    )), '"'),
    interpolated_content: _ => token.immediate(prec(1, choice(/[^"{}\\]+/, '}'))),
    interpolation_escape: _ => token.immediate(prec(2, choice('{{', '}}'))),
    interpolation: $ => seq('{', repeat(choice(
      $._non_delimiter_item, alias(choice(',', ';'), $.delimiter),
    )), optional(seq(':', optional($.format_specifier))), '}'),
    format_specifier: _ => token.immediate(/[^}]+/),
    braced_group: $ => seq('{', repeat($._item), '}'),
    parenthesized_group: $ => seq(choice('(', '?('), repeat($._item), ')'),
    bracketed_group: $ => seq(choice('[', '?['), repeat($._item), ']'),
    line_comment: _ => token(seq('#', optional(seq(/[^\[\r\n]/, /[^\r\n]*/)))),
    operator: _ => choice(
      ':=', '+=', '-=', '*=', '/=', '%=', '//=', '**=', '..=',
      '≠', '!=', '=/', '≦', '≤', '<=', '≧', '≥', '>=',
      '=', '<', '>', '??', '?.', '...', '..', '**', '//',
      '+', '-', '*', '/', '%', '!', '|', '&', '.', '?', '->',
    ),
    delimiter: _ => choice(',', ';', ':'),
  },
});
