; tags.scm - Dart symbol tagging queries

; Classes
(class_declaration
  name: (identifier) @name) @definition.class

; Mixins
(mixin_declaration
  (identifier) @name) @definition.class

; Extensions
(extension_declaration
  name: (identifier) @name) @definition.class

; Extension types
(extension_type_declaration
  name: (identifier) @name) @definition.class

; Enums
(enum_declaration
  name: (identifier) @name) @definition.class

; Top-level functions
(function_declaration
  signature: (function_signature
    name: (identifier) @name)) @definition.function

; Top-level getters
(getter_declaration
  signature: (getter_signature
    name: (identifier) @name)) @definition.function

; Top-level setters
(setter_declaration
  signature: (setter_signature
    name: (identifier) @name)) @definition.function

; External top-level functions/getters/setters
(external_function_declaration
  signature: (function_signature
    name: (identifier) @name)) @definition.function

(external_getter_declaration
  signature: (getter_signature
    name: (identifier) @name)) @definition.function

(external_setter_declaration
  signature: (setter_signature
    name: (identifier) @name)) @definition.function

; Top-level variables
(top_level_variable_declaration
  (static_final_declaration_list
    (static_final_declaration
      name: (identifier) @name))) @definition.variable

(top_level_variable_declaration
  (initialized_identifier_list
    (initialized_identifier
      name: (identifier) @name))) @definition.variable

(external_variable_declaration
  (identifier_list
    (identifier) @name)) @definition.variable

; Methods
(method_signature
  (function_signature
    name: (identifier) @name)) @definition.method

; Getters (as methods)
(method_signature
  (getter_signature
    name: (identifier) @name)) @definition.method

; Setters (as methods)
(method_signature
  (setter_signature
    name: (identifier) @name)) @definition.method

; Operator methods
(method_signature
  (operator_signature)) @definition.method

; Constructors
(constructor_signature
  name: (identifier) @name
  . [(comment) "." "new"]*
  . parameters: (formal_parameter_list)) @definition.method

; Const constructors
(constant_constructor_signature
  name: (identifier) @name
  . [(comment) "." "new"]*
  . parameters: (formal_parameter_list)) @definition.method

; Factory constructors
(factory_constructor_signature
  name: (identifier) @name
  . [(comment) "." "new"]*
  . parameters: (formal_parameter_list)) @definition.method

; Redirecting factory constructors
(redirecting_factory_constructor_signature
  name: (identifier) @name
  . [(comment) "." "new"]*
  . parameters: (formal_parameter_list)) @definition.method

((primary_constructor
  name: (identifier) @name) @definition.method
  (#not-eq? @name "new"))

[
  (class_declaration
    name: (identifier) @name
    (primary_constructor !name)) @definition.method
  (enum_declaration
    name: (identifier) @name
    (primary_constructor !name)) @definition.method
  (extension_type_declaration
    name: (identifier) @name
    (primary_constructor !name)) @definition.method
]

([
  (class_declaration
    name: (identifier) @name
    (primary_constructor name: (identifier) @_constructor)) @definition.method
  (enum_declaration
    name: (identifier) @name
    (primary_constructor name: (identifier) @_constructor)) @definition.method
  (extension_type_declaration
    name: (identifier) @name
    (primary_constructor name: (identifier) @_constructor)) @definition.method
]
  (#eq? @_constructor "new"))

(_
  name: (identifier) @name
  body: (_
    (class_member
      (declaration [
        (constructor_signature !name)
        (constant_constructor_signature !name)
        (factory_constructor_signature !name)
        (redirecting_factory_constructor_signature !name)
      ])))) @definition.method

(_
  name: (identifier) @name
  body: (_
    (class_member
      (method_declaration
        signature: (method_signature [
          (constructor_signature !name)
          (factory_constructor_signature !name)
        ]))))) @definition.method

; Typedefs
(type_alias
  (type_identifier) @name) @definition.type

; Enum constants
(enum_constant
  name: (identifier) @name) @definition.constant

; Function call references
(call_expression
  function: (identifier) @name) @reference.call

(call_expression
  function: [
    (member_expression property: (identifier) @name)
    (null_aware_member_expression property: (identifier) @name)
  ]) @reference.call
