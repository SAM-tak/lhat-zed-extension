#include "tree_sitter/parser.h"
#include <wctype.h>

// Nested #[ ... ]# comments (including #[~ disabled code ]#) are scanned
// atomically so quotes and line comments inside them cannot hide delimiters.
void *tree_sitter_lhat_external_scanner_create(void) { return NULL; }
void tree_sitter_lhat_external_scanner_destroy(void *payload) { (void)payload; }
unsigned tree_sitter_lhat_external_scanner_serialize(void *payload, char *buffer) {
    (void)payload; (void)buffer; return 0;
}
void tree_sitter_lhat_external_scanner_deserialize(void *payload, const char *buffer, unsigned length) {
    (void)payload; (void)buffer; (void)length;
}
bool tree_sitter_lhat_external_scanner_scan(void *payload, TSLexer *lexer, const bool *valid_symbols) {
    (void)payload;
    if (!valid_symbols[0]) return false;
    while (iswspace(lexer->lookahead)) lexer->advance(lexer, true);
    if (lexer->lookahead != '#') return false;
    lexer->advance(lexer, false);
    if (lexer->lookahead != '[') return false;
    lexer->advance(lexer, false);
    unsigned depth = 1;
    while (depth && !lexer->eof(lexer)) {
        int32_t ch = lexer->lookahead;
        lexer->advance(lexer, false);
        if (ch == '#' && lexer->lookahead == '[') {
            lexer->advance(lexer, false);
            ++depth;
        } else if (ch == ']' && lexer->lookahead == '#') {
            lexer->advance(lexer, false);
            --depth;
        }
    }
    lexer->mark_end(lexer);
    lexer->result_symbol = 0;
    return true;
}
