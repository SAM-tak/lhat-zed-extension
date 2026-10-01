#include "tree_sitter/parser.h"
#include <wctype.h>
#include <string.h>

enum Token {
    BLOCK_COMMENT, BINDING_WORD, FUNCTION_WORD, DEF_WORD, SELF_WORD, TYPE_WORD,
    ENUM_WORD, ERROR_WORD, MODULE_WORD, RETURN_WORD, PUBLIC_WORD, OP_WORD,
    MODIFIER_WORD, DELEGATE_WORD, PREFIX_WORD, BINARY_WORD, CONTROL_WORD, STRING_GUARD,
};

static void skip_trivia(TSLexer *lexer) {
    for (;;) {
        while (iswspace(lexer->lookahead)) lexer->advance(lexer, false);
        if (lexer->lookahead != '#') return;
        lexer->advance(lexer, false);
        if (lexer->lookahead != '[') {
            while (!lexer->eof(lexer) && lexer->lookahead != '\r' && lexer->lookahead != '\n') lexer->advance(lexer, false);
        } else {
            lexer->advance(lexer, false);
            unsigned depth = 1;
            while (depth && !lexer->eof(lexer)) {
                int32_t ch = lexer->lookahead;
                lexer->advance(lexer, false);
                if (ch == '#' && lexer->lookahead == '[') { lexer->advance(lexer, false); ++depth; }
                else if (ch == ']' && lexer->lookahead == '#') { lexer->advance(lexer, false); --depth; }
            }
        }
    }
}

// Recognize a keyword only when its hat is attached. Returning just the word
// leaves the hat to the internal lexer and preserves independent highlighting.
// Plain `let`, `f`, `enum`, ... remain ordinary identifiers.
static bool scan_word(TSLexer *lexer, const bool *valid_symbols) {
    char word[24];
    unsigned length = 0;
    while ((lexer->lookahead >= 'a' && lexer->lookahead <= 'z') || lexer->lookahead == '_') {
        if (length + 1 >= sizeof word) return false;
        word[length++] = (char)lexer->lookahead;
        lexer->advance(lexer, false);
    }
    word[length] = '\0';
    if (lexer->lookahead != '^') return false;
    lexer->mark_end(lexer);
    lexer->advance(lexer, false);
    if (lexer->lookahead == '^') return false;
    enum Token token;
    if (!strcmp(word, "let") || !strcmp(word, "var")) token = BINDING_WORD;
    else if (!strcmp(word, "f") || !strcmp(word, "p")) token = FUNCTION_WORD;
    else if (!strcmp(word, "def")) token = DEF_WORD;
    else if (!strcmp(word, "self")) token = SELF_WORD;
    else if (!strcmp(word, "t") || !strcmp(word, "c")) token = TYPE_WORD;
    else if (!strcmp(word, "enum")) token = ENUM_WORD;
    else if (!strcmp(word, "errordef") || !strcmp(word, "localerrordef")) token = ERROR_WORD;
    else if (!strcmp(word, "module")) token = MODULE_WORD;
    else if (!strcmp(word, "return")) token = RETURN_WORD;
    else if (!strcmp(word, "public")) token = PUBLIC_WORD;
    else if (!strcmp(word, "op")) token = OP_WORD;
    else if (!strcmp(word, "abstract") || !strcmp(word, "override") || !strcmp(word, "overload")) token = MODIFIER_WORD;
    else if (!strcmp(word, "delegate")) token = DELEGATE_WORD;
    else if (!strcmp(word, "import") || !strcmp(word, "require") || !strcmp(word, "box") ||
             !strcmp(word, "constbox") || !strcmp(word, "pack") || !strcmp(word, "typeof") ||
             !strcmp(word, "id") || !strcmp(word, "await") || !strcmp(word, "closed")) token = PREFIX_WORD;
    else if (!strcmp(word, "and") || !strcmp(word, "or") || !strcmp(word, "is") ||
             !strcmp(word, "fits") || !strcmp(word, "as") || !strcmp(word, "catch")) token = BINARY_WORD;
    else if (!strcmp(word, "if") || !strcmp(word, "for") || !strcmp(word, "repeat") ||
             !strcmp(word, "do") || !strcmp(word, "with")) token = CONTROL_WORD;
    else return false;
    if (!valid_symbols[token]) return false;
    if (token == DEF_WORD || token == SELF_WORD || token == TYPE_WORD) {
        skip_trivia(lexer);
        if (lexer->lookahead != '{') return false;
    }
    lexer->result_symbol = token;
    return true;
}

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
    // Never consume external extras inside string text (or during recovery
    // when every symbol is valid). STRING_GUARD is a sentinel, never emitted.
    if (valid_symbols[STRING_GUARD]) return false;
    while (iswspace(lexer->lookahead)) lexer->advance(lexer, true);
    if (lexer->lookahead != '#') return scan_word(lexer, valid_symbols);
    if (!valid_symbols[BLOCK_COMMENT]) return false;
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
    lexer->result_symbol = BLOCK_COMMENT;
    return true;
}
