#include "tree_sitter/parser.h"

enum TokenType {
  TEMPLATE_CHARS_SINGLE,
  TEMPLATE_CHARS_DOUBLE,
  TEMPLATE_CHARS_SINGLE_SINGLE,
  TEMPLATE_CHARS_DOUBLE_SINGLE,
  TEMPLATE_CHARS_RAW_SLASH,
  BLOCK_COMMENT,
  DOCUMENTATION_BLOCK_COMMENT,
  ANNOTATION_OPEN_PAREN,
  INTERPOLATION_START,
  // Never emitted: recovery enables every external token, preserving the template-scanner path.
  ERROR_RECOVERY,
};

void *tree_sitter_dart_external_scanner_create() { return NULL; }
void tree_sitter_dart_external_scanner_destroy(void *p) { (void)p; }
void tree_sitter_dart_external_scanner_reset(void *p) { (void)p; }
unsigned tree_sitter_dart_external_scanner_serialize(void *p, char *buffer) { (void)p; (void)buffer; return 0; }
void tree_sitter_dart_external_scanner_deserialize(void *p, const char *b, unsigned n) { (void)p; (void)b; (void)n; }

static bool scan_templates(TSLexer *lexer, const bool *valid_symbols);
static bool scan_multiline_comments(TSLexer *lexer);
static bool is_whitespace(int32_t c);
static void advance(TSLexer *lexer);

bool tree_sitter_dart_external_scanner_scan(void *payload, TSLexer *lexer,
                                                  const bool *valid_symbols) {
  (void)payload;
  if (valid_symbols[INTERPOLATION_START] && !valid_symbols[ERROR_RECOVERY] && lexer->lookahead == '$') {
    advance(lexer);
    lexer->mark_end(lexer);
    int32_t next = lexer->lookahead;
    if (next != '{' && next != '_' && !(next >= 'a' && next <= 'z') && !(next >= 'A' && next <= 'Z')) return false;
    lexer->result_symbol = INTERPOLATION_START;
    return true;
  }
  if (valid_symbols[TEMPLATE_CHARS_DOUBLE] || valid_symbols[TEMPLATE_CHARS_SINGLE] ||
      valid_symbols[TEMPLATE_CHARS_DOUBLE_SINGLE] || valid_symbols[TEMPLATE_CHARS_SINGLE_SINGLE]) {
    return scan_templates(lexer, valid_symbols);
  }

  // Whitespace separates @override from a following record type's parenthesis.
  if (valid_symbols[ANNOTATION_OPEN_PAREN] && lexer->lookahead == '(') {
    advance(lexer);
    lexer->mark_end(lexer);
    lexer->result_symbol = ANNOTATION_OPEN_PAREN;
    return true;
  }

  while (is_whitespace(lexer->lookahead)) lexer->advance(lexer, true);

  if (lexer->lookahead == '/') {
    return scan_multiline_comments(lexer);
  }
  return false;
}

static bool scan_templates(TSLexer *lexer, const bool *valid_symbols) {
  const enum TokenType templates[] = {
    TEMPLATE_CHARS_DOUBLE, TEMPLATE_CHARS_SINGLE,
    TEMPLATE_CHARS_SINGLE_SINGLE, TEMPLATE_CHARS_DOUBLE_SINGLE,
  };
  for (unsigned i = 0; i < sizeof(templates) / sizeof(templates[0]); i++) {
    if (valid_symbols[templates[i]]) {
      lexer->result_symbol = templates[i];
      break;
    }
  }
  for (bool has_content = false;; has_content = true) {
    lexer->mark_end(lexer);
    switch (lexer->lookahead) {
      case '\'':
      case '"':
        return has_content;
      case '\n':
      case '\r':
        if (valid_symbols[TEMPLATE_CHARS_DOUBLE_SINGLE] || valid_symbols[TEMPLATE_CHARS_SINGLE_SINGLE]) return false;
        advance(lexer);
        break;
      case '\0':
        if (lexer->eof(lexer)) return false;
        advance(lexer);
        break;
      case '$':
        return has_content;
      case '\\':
        if (!valid_symbols[TEMPLATE_CHARS_RAW_SLASH]) return has_content;
        lexer->result_symbol = TEMPLATE_CHARS_RAW_SLASH;
        advance(lexer);
        break;
      default:
        advance(lexer);
    }
  }
}

static bool scan_multiline_comments(TSLexer *lexer) {
  advance(lexer);
  if (lexer->lookahead != '*') return false;
  advance(lexer);
  lexer->result_symbol = lexer->lookahead == '*' ? DOCUMENTATION_BLOCK_COMMENT : BLOCK_COMMENT;

  unsigned nesting_depth = 1;
  while (!lexer->eof(lexer)) {
    int32_t previous = lexer->lookahead;
    advance(lexer);
    if (previous == '*' && lexer->lookahead == '/') {
      advance(lexer);
      if (--nesting_depth == 0) return true;
    } else if (previous == '/' && lexer->lookahead == '*') {
      advance(lexer);
      nesting_depth++;
    }
  }
  return false;
}

static bool is_whitespace(int32_t c) {
  return c == ' ' || (c >= '\t' && c <= '\r');
}

static void advance(TSLexer *lexer) { lexer->advance(lexer, false); }
