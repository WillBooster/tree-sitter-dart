(class_declaration
  name: (identifier) @name) @definition.class

(mixin_declaration
  (identifier) @name) @definition.class

(extension_declaration
  name: (identifier) @name) @definition.class

(extension_type_declaration
  name: (identifier) @name) @definition.class

(enum_declaration
  name: (identifier) @name) @definition.class

(function_declaration
  signature: (function_signature
    name: (identifier) @name)) @definition.function

(getter_declaration
  signature: (getter_signature
    name: (identifier) @name)) @definition.function

(setter_declaration
  signature: (setter_signature
    name: (identifier) @name)) @definition.function

(external_function_declaration
  signature: (function_signature
    name: (identifier) @name)) @definition.function

(external_getter_declaration
  signature: (getter_signature
    name: (identifier) @name)) @definition.function

(external_setter_declaration
  signature: (setter_signature
    name: (identifier) @name)) @definition.function

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

(method_signature
  (function_signature
    name: (identifier) @name)) @definition.method

(method_signature
  (getter_signature
    name: (identifier) @name)) @definition.method

(method_signature
  (setter_signature
    name: (identifier) @name)) @definition.method

(method_signature
  (operator_signature
    operator: _ @name)) @definition.method

(constructor_signature
  name: (identifier) @name
  . [(comment) "." "new"]*
  . parameters: (formal_parameter_list)) @definition.method

(constant_constructor_signature
  name: (identifier) @name
  . [(comment) "." "new"]*
  . parameters: (formal_parameter_list)) @definition.method

(factory_constructor_signature
  name: (identifier) @name
  . [(comment) "." "new"]*
  . parameters: (formal_parameter_list)) @definition.method

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

(type_alias
  (type_identifier) @name) @definition.type

(enum_constant
  name: (identifier) @name) @definition.constant

(call_expression
  function: (identifier) @name) @reference.call

(call_expression
  function: [
    (member_expression property: (identifier) @name)
    (null_aware_member_expression property: (identifier) @name)
  ]) @reference.call

(cascade_call_expression
  property: (identifier) @name) @reference.call

(cascade_call_expression
  function: [
    (cascade_member_expression property: (identifier) @name)
    (cascade_null_aware_member_expression property: (identifier) @name)
  ]) @reference.call

(call_expression
  function: (static_member_shorthand
    (identifier) @name)) @reference.call

(call_expression
  function: (instantiation_expression
    function: (static_member_shorthand
      (identifier) @name))) @reference.call
