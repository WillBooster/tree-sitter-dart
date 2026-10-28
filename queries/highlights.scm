; highlights.scm - Dart syntax highlighting queries

; ============================================================================
; Comments
; ============================================================================

(comment) @comment
(block_comment) @comment.block
(documentation_block_comment) @comment.block.documentation

; ============================================================================
; Literals
; ============================================================================

(decimal_integer_literal) @number
(hex_integer_literal) @number
(decimal_floating_point_literal) @number.float

(true) @boolean
(false) @boolean
(null_literal) @constant.builtin

(string_literal) @string
(template_chars_single) @string
(template_chars_double) @string
(template_chars_single_single) @string
(template_chars_double_single) @string
(template_chars_raw_slash) @string
(escape_sequence) @string.escape

(symbol_literal) @string.special.symbol

; ============================================================================
; Types
; ============================================================================

(type_identifier) @type
(void_type) @type.builtin

(type_parameter
  (type_identifier) @type.parameter)

"Function" @type.builtin

; Built-in types
((type_identifier) @type.builtin
  (#match? @type.builtin "^(int|double|num|String|bool|List|Set|Map|Runes|Symbol|Future|Stream|Iterable|Never|dynamic|Object)$"))

; ============================================================================
; Functions
; ============================================================================

; Function/getter/setter names (matches at any nesting level)
(function_signature
  name: (identifier) @function)

(getter_signature
  name: (identifier) @function)

(setter_signature
  name: (identifier) @function)

; Methods (inside class/mixin/extension bodies)
(method_signature
  (function_signature
    name: (identifier) @function.method))

(method_signature
  (getter_signature
    name: (identifier) @function.method))

(method_signature
  (setter_signature
    name: (identifier) @function.method))

; Operator methods
(operator_signature
  "operator" @keyword)

; Property access
[
  (member_expression)
  (null_aware_member_expression)
  (cascade_member_expression)
  (cascade_null_aware_member_expression)
] property: (identifier) @property

((cascade_selector (identifier) @property) @_selector
  (#eq? @_selector @property))

; Function calls (non-method)
(call_expression
  function: (identifier) @function.call)

; Method calls
(call_expression
  function: [
    (member_expression property: (identifier) @function.method.call)
    (null_aware_member_expression property: (identifier) @function.method.call)
  ])

(cascade_call_expression
  property: (identifier) @function.method.call)

; ============================================================================
; Declarations
; ============================================================================

(class_declaration
  name: (identifier) @type)

(mixin_declaration
  (identifier) @type)

(extension_declaration
  name: (identifier) @type)

(extension_type_declaration
  name: (identifier) @type)

(enum_declaration
  name: (identifier) @type)

(enum_constant
  name: (identifier) @constant)

(type_alias
  (type_identifier) @type.definition)

; Constructors
(constructor_signature
  name: (identifier) @constructor)

(constant_constructor_signature
  (identifier) @constructor)

(factory_constructor_signature
  (identifier) @constructor)

(redirecting_factory_constructor_signature
  (identifier) @constructor)

(primary_constructor
  name: (identifier) @constructor)

; ============================================================================
; Parameters
; ============================================================================

(formal_parameter
  (identifier) @variable.parameter)

(constructor_param
  (identifier) @variable.parameter)

(super_formal_parameter
  (identifier) @variable.parameter)

; Named arguments
(named_argument
  (label
    (identifier) @variable.parameter))

; ============================================================================
; Variables
; ============================================================================

(initialized_variable_definition
  name: (identifier) @variable)

(initialized_identifier
  (identifier) @variable)

((variable_pattern
  name: (identifier) @variable)
  (#not-eq? @variable "_"))

(static_final_declaration
  (identifier) @variable)

; ============================================================================
; Operators
; ============================================================================

(relational_operator) @operator
(prefix_operator) @operator
(negate_operator) @operator
(binary_operator) @operator

[
  "="
  "+="
  "-="
  "*="
  "/="
  "%="
  "~/="
  "<<="
  ">>="
  ">>>="
  "&="
  "^="
  "|="
  "??="
  "=="
  "!="
  "+"
  "-"
  "*"
  "/"
  "%"
  "~/"
  "<<"
  ">>"
  ">>>"
  "&"
  "^"
  "|"
  "&&"
  "||"
  "??"
  "!"
  "~"
  "++"
  "--"
  ".."
  "?.."
  "..."
  "...?"
  "=>"
] @operator

; ============================================================================
; Punctuation
; ============================================================================

["(" ")" "[" "]" "{" "}"] @punctuation.bracket

(type_arguments
  "<" @punctuation.bracket
  ">" @punctuation.bracket)

(type_parameters
  "<" @punctuation.bracket
  ">" @punctuation.bracket)

["," ";" ":" "." "?." "?."] @punctuation.delimiter

"@" @punctuation.special
"#" @punctuation.special

; ============================================================================
; Keywords
; ============================================================================

[
  "abstract"
  "as"
  "assert"
  "async"
  "async*"
  "augment"
  "await"
  "base"
  "break"
  "case"
  "catch"
  "class"
  "const"
  "continue"
  "covariant"
  "default"
  "deferred"
  "do"
  "else"
  "enum"
  "export"
  "extends"
  "extension"
  "external"
  "factory"
  "final"
  "finally"
  "for"
  "get"
  "hide"
  "if"
  "implements"
  "import"
  "in"
  "inline"
  "interface"
  "is"
  "late"
  "library"
  "mixin"
  "native"
  "new"
  "on"
  "operator"
  "part"
  "required"
  "return"
  "sealed"
  "set"
  "show"
  "static"
  "super"
  "switch"
  "sync*"
  "this"
  "throw"
  "try"
  "type"
  "typedef"
  "var"
  "when"
  "while"
  "with"
  "yield"
] @keyword

; ============================================================================
; Special identifiers
; ============================================================================

((identifier) @variable.builtin
  (#eq? @variable.builtin "this"))

((identifier) @variable.builtin
  (#eq? @variable.builtin "super"))

(template_substitution
  "$" @punctuation.special
  "{" @punctuation.special
  "}" @punctuation.special)
(annotation "@" @attribute)
(annotation name: (identifier) @attribute)
(annotation name: (qualified [(type_identifier) (identifier)] @attribute))
(annotation (type_arguments) (identifier) @attribute)
(is_operator ["is" "!"] @keyword.operator)

(type_cast "as" @keyword.operator)
(cast_pattern "as" @keyword.operator)

((class_declaration
  name: (identifier) @_class
  body: (class_body
    (class_member [
      (method_declaration
        signature: (method_signature (constructor_signature . (identifier) @function.method . (formal_parameter_list)) @_signature))
      (declaration (constructor_signature . (identifier) @function.method . (formal_parameter_list)) @_signature)
    ])))
  (#not-eq? @_class @function.method)
  (#not-match? @_signature "^new\\b"))

((extension_type_declaration
  name: (identifier) @_class
  body: (class_body
    (class_member [
      (method_declaration
        signature: (method_signature (constructor_signature . (identifier) @function.method . (formal_parameter_list)) @_signature))
      (declaration (constructor_signature . (identifier) @function.method . (formal_parameter_list)) @_signature)
    ])))
  (#not-eq? @_class @function.method)
  (#not-match? @_signature "^new\\b"))

((enum_declaration
  name: (identifier) @_class
  body: (enum_body
    (class_member [
      (method_declaration
        signature: (method_signature (constructor_signature . (identifier) @function.method . (formal_parameter_list)) @_signature))
      (declaration (constructor_signature . (identifier) @function.method . (formal_parameter_list)) @_signature)
    ])))
  (#not-eq? @_class @function.method)
  (#not-match? @_signature "^new\\b"))

(mixin_declaration
  body: (class_body
    (class_member [
      (method_declaration
        signature: (method_signature (constructor_signature . (identifier) @function.method . (formal_parameter_list))))
      (declaration (constructor_signature . (identifier) @function.method . (formal_parameter_list)))
    ])))

(extension_declaration
  body: (extension_body
    (class_member [
      (method_declaration
        signature: (method_signature (constructor_signature . (identifier) @function.method . (formal_parameter_list))))
      (declaration (constructor_signature . (identifier) @function.method . (formal_parameter_list)))
    ])))

