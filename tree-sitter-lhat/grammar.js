// Editor grammar: preserve lexical forms and balanced groups. Semantic and
// syntactic validation belongs to lhatls, including LTON's restricted values.
const identifier = /[_\p{XID_Start}][_\p{XID_Continue}]*/;

module.exports = grammar({
  name: 'lhat',
  extras: _ => [/\s/],
  externals: $ => [$.block_comment],
  rules: {
    source_file: $ => repeat($._item),
    _item: $ => choice($._non_delimiter_item, $.delimiter),
    _non_delimiter_item: $ => choice(
      $.identifier, $.hat_identifier, $.scoped_identifier, $.name_literal,
      $.annotation, $.number, $.string, $.raw_string, $.line_string,
      $.interpolated_string, $.braced_group, $.parenthesized_group,
      $.bracketed_group, $.operator, $.numeric_member,
      $.line_comment, $.block_comment,
    ),
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
    string: $ => seq('"', repeat(choice($.string_content, $.escape_sequence)), '"'),
    string_content: _ => token.immediate(prec(1, /[^"\\]+/)),
    escape_sequence: _ => token.immediate(seq('\\', choice(
      /[nrt0\\"]/, /x[0-9a-fA-F]{2}/, /u\{[0-9a-fA-F]+\}/, /\r?\n/,
    ))),
    raw_string: _ => token(seq("'", repeat(choice("''", /[^']/)), "'")),
    line_string: _ => token(prec(2, /"""[^\r\n]*/)),
    interpolated_string: $ => seq('$"', repeat(choice(
      $.interpolated_content, $.interpolation_escape, $.escape_sequence, $.interpolation,
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
