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
  INSTANTIATION_CLOSE,
  ANNOTATION_END,
  ANNOTATION_DOT,
  ANNOTATION_TYPE_ARGUMENTS,
  ANNOTATION_ARGUMENTS_START,
  // Never emitted: recovery enables every external token, preserving the template-scanner path.
  ERROR_RECOVERY,
};

void *tree_sitter_dart_external_scanner_create(void) { return NULL; }
void tree_sitter_dart_external_scanner_destroy(void *p) { (void)p; }
unsigned tree_sitter_dart_external_scanner_serialize(void *p, char *buffer) { (void)p; (void)buffer; return 0; }
void tree_sitter_dart_external_scanner_deserialize(void *p, const char *b, unsigned n) { (void)p; (void)b; (void)n; }

static bool scan_templates(TSLexer *lexer, const bool *valid_symbols);
static inline enum TokenType select_template_symbol(const bool *valid_symbols);
static inline bool finish_template(TSLexer *lexer, bool has_content);
static bool scan_annotation_boundary(TSLexer *lexer, const bool *valid_symbols);
static bool scan_interpolation_start(TSLexer *lexer);
static bool scan_multiline_comments(TSLexer *lexer);
static bool scan_instantiation_close(TSLexer *lexer);
static bool skip_trivia(TSLexer *lexer);
static bool skip_comment(TSLexer *lexer);
static bool scan_block_comment_body(TSLexer *lexer);
static inline bool at_eof(TSLexer *lexer);
static inline bool is_whitespace(int32_t c);
static inline void advance(TSLexer *lexer);

bool tree_sitter_dart_external_scanner_scan(void *payload, TSLexer *lexer,
                                                  const bool *valid_symbols) {
  (void)payload;
  if (valid_symbols[INTERPOLATION_START] && !valid_symbols[ERROR_RECOVERY] && lexer->lookahead == '$') {
    return scan_interpolation_start(lexer);
  }
  if (valid_symbols[TEMPLATE_CHARS_DOUBLE] || valid_symbols[TEMPLATE_CHARS_SINGLE] ||
      valid_symbols[TEMPLATE_CHARS_DOUBLE_SINGLE] || valid_symbols[TEMPLATE_CHARS_SINGLE_SINGLE]) {
    return scan_templates(lexer, valid_symbols);
  }

  if (!valid_symbols[ERROR_RECOVERY] && (valid_symbols[ANNOTATION_END] ||
      valid_symbols[ANNOTATION_DOT] || valid_symbols[ANNOTATION_TYPE_ARGUMENTS] || valid_symbols[ANNOTATION_ARGUMENTS_START])) {
    return scan_annotation_boundary(lexer, valid_symbols);
  }

  if (valid_symbols[ANNOTATION_OPEN_PAREN] && lexer->lookahead == '(') {
    advance(lexer);
    lexer->mark_end(lexer);
    lexer->result_symbol = ANNOTATION_OPEN_PAREN;
    return true;
  }

  while (is_whitespace(lexer->lookahead)) lexer->advance(lexer, true);

  if (valid_symbols[INSTANTIATION_CLOSE] && !valid_symbols[ERROR_RECOVERY] && lexer->lookahead == '>') {
    return scan_instantiation_close(lexer);
  }

  if (lexer->lookahead == '/') {
    return scan_multiline_comments(lexer);
  }
  return false;
}

static bool scan_interpolation_start(TSLexer *lexer) {
  advance(lexer);
  int32_t next = lexer->lookahead;
  if (next != '{' && next != '_' && (((uint32_t)next | 32u) - 'a') >= 26u) return false;
  lexer->mark_end(lexer);
  lexer->result_symbol = INTERPOLATION_START;
  return true;
}

static bool scan_templates(TSLexer *lexer, const bool *valid_symbols) {
  lexer->result_symbol = select_template_symbol(valid_symbols);
  bool single_line = valid_symbols[TEMPLATE_CHARS_DOUBLE_SINGLE] || valid_symbols[TEMPLATE_CHARS_SINGLE_SINGLE];
  for (bool has_content = false;; has_content = true) {
    switch (lexer->lookahead) {
      case '\'':
      case '"':
      case '$':
        return finish_template(lexer, has_content);
      case '\n':
      case '\r':
        if (single_line) return false;
        break;
      case '\0':
        if (lexer->eof(lexer)) return false;
        break;
      case '\\':
        if (!valid_symbols[TEMPLATE_CHARS_RAW_SLASH]) return finish_template(lexer, has_content);
        lexer->result_symbol = TEMPLATE_CHARS_RAW_SLASH;
        break;
      default:
        break;
    }
    advance(lexer);
  }
}

static inline enum TokenType select_template_symbol(const bool *valid_symbols) {
  if (valid_symbols[TEMPLATE_CHARS_DOUBLE]) return TEMPLATE_CHARS_DOUBLE;
  if (valid_symbols[TEMPLATE_CHARS_SINGLE]) return TEMPLATE_CHARS_SINGLE;
  if (valid_symbols[TEMPLATE_CHARS_SINGLE_SINGLE]) return TEMPLATE_CHARS_SINGLE_SINGLE;
  return TEMPLATE_CHARS_DOUBLE_SINGLE;
}

static inline bool finish_template(TSLexer *lexer, bool has_content) {
  if (has_content) lexer->mark_end(lexer);
  return has_content;
}

static bool scan_annotation_boundary(TSLexer *lexer, const bool *valid_symbols) {
  lexer->mark_end(lexer);
  if (lexer->lookahead == '(' && valid_symbols[ANNOTATION_ARGUMENTS_START]) {
    lexer->result_symbol = ANNOTATION_ARGUMENTS_START;
    return true;
  }
  if (skip_trivia(lexer) && (lexer->lookahead == '.' || lexer->lookahead == '<')) {
    enum TokenType continuation = lexer->lookahead == '.' ? ANNOTATION_DOT : ANNOTATION_TYPE_ARGUMENTS;
    if (!valid_symbols[continuation]) return false;
    lexer->result_symbol = continuation;
    return true;
  }
  if (!valid_symbols[ANNOTATION_END]) return false;
  lexer->result_symbol = ANNOTATION_END;
  return true;
}

static bool scan_multiline_comments(TSLexer *lexer) {
  advance(lexer);
  if (lexer->lookahead != '*') return false;
  advance(lexer);
  lexer->result_symbol = lexer->lookahead == '*' ? DOCUMENTATION_BLOCK_COMMENT : BLOCK_COMMENT;

  return scan_block_comment_body(lexer);
}

static bool scan_instantiation_close(TSLexer *lexer) {
  advance(lexer);
  if (lexer->lookahead == '=') return false;
  lexer->mark_end(lexer);
  if (!skip_trivia(lexer)) return false;
  lexer->result_symbol = INSTANTIATION_CLOSE;
  switch (lexer->lookahead) {
    case '(':
    case ')':
    case ']':
    case '}':
    case ';':
    case ':':
    case ',':
      return true;
    case '.':
      advance(lexer);
      return lexer->lookahead != '.';
    case '=':
    case '!':
      advance(lexer);
      return lexer->lookahead == '=';
    default:
      return at_eof(lexer);
  }
}

static bool skip_trivia(TSLexer *lexer) {
  for (;;) {
    if (is_whitespace(lexer->lookahead)) {
      advance(lexer);
    } else if (lexer->lookahead == '/') {
      if (!skip_comment(lexer)) return false;
    } else {
      return true;
    }
  }
}

static bool skip_comment(TSLexer *lexer) {
  advance(lexer);
  if (lexer->lookahead == '/') {
    while (lexer->lookahead != '\n' && lexer->lookahead != '\r' && !at_eof(lexer)) advance(lexer);
    return true;
  }
  if (lexer->lookahead != '*') return false;
  advance(lexer);
  return scan_block_comment_body(lexer);
}

static bool scan_block_comment_body(TSLexer *lexer) {
  unsigned nesting_depth = 1;
  while (!at_eof(lexer)) {
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

static inline bool at_eof(TSLexer *lexer) {
  return lexer->lookahead == 0 && lexer->eof(lexer);
}

static inline bool is_whitespace(int32_t c) {
  return c == ' ' || ((uint32_t)c - '\t') < 5u;
}

static inline void advance(TSLexer *lexer) { lexer->advance(lexer, false); }
