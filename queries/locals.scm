((class_declaration (primary_constructor)  body: (class_body (class_member (declaration ["static" "late"]* @_modifier (initialized_identifier_list (initialized_identifier value: (_) @local.scope))))))
  (#not-any-of? @_modifier "static" "late"))

((enum_declaration (primary_constructor)  body: (enum_body (class_member (declaration ["static" "late"]* @_modifier (initialized_identifier_list (initialized_identifier value: (_) @local.scope))))))
  (#not-any-of? @_modifier "static" "late"))

(primary_constructor) @local.scope

[
  (function_declaration)
  (local_function_declaration)
  (method_declaration)
  (getter_declaration)
  (setter_declaration)
  (external_function_declaration)
  (external_getter_declaration)
  (external_setter_declaration)
] @local.scope

(class_member
  (declaration [
    (function_signature)
    (getter_signature)
    (setter_signature)
    (operator_signature)
  ])) @local.scope

(formal_parameter
  (formal_parameter_list) @local.scope)

(formal_parameter
  (type_parameters) @local.scope)

(formal_parameter
  (type_parameters) @local.scope-source
  (formal_parameter_list) @local.scope-import)

(constructor_param
  (formal_parameter_list) @local.scope)

(constructor_param
  (type_parameters) @local.scope)

(constructor_param
  (type_parameters) @local.scope-source
  (formal_parameter_list) @local.scope-import)

(super_formal_parameter
  (formal_parameter_list) @local.scope)

(super_formal_parameter
  (type_parameters) @local.scope)

(super_formal_parameter
  (type_parameters) @local.scope-source
  (formal_parameter_list) @local.scope-import)

(function_type) @local.scope

(type_alias) @local.scope

[
  (class_declaration)
  (mixin_declaration)
  (extension_declaration)
  (extension_type_declaration)
  (enum_declaration)
  (function_body)
  (function_expression)
  (block)
  (for_statement)
  (for_element)
  (try_statement)
  (catch_clause)
  (finally_clause)
  (switch_statement_case)
  (switch_expression_case)
] @local.scope

[
  (for_statement value: (_)+ @local.definition-value)
  (for_element value: (_)+ @local.definition-value)
] @local.definition-context

(class_member
  (declaration [
    (constructor_signature)
    (constant_constructor_signature)
    (factory_constructor_signature)
    (redirecting_factory_constructor_signature)
  ])) @local.scope

([
  (member_expression property: (identifier) @local.scope)
  (null_aware_member_expression property: (identifier) @local.scope)
  (cascade_member_expression property: (identifier) @local.scope)
  (cascade_null_aware_member_expression property: (identifier) @local.scope)
  (cascade_call_expression property: (identifier) @local.scope)
  (static_member_shorthand (identifier) @local.scope)
  (label (identifier) @local.scope)
  (annotation name: (identifier) @local.scope)
  (annotation name: (qualified) @local.scope)
  (annotation (type_arguments) (identifier) @local.scope)
  (constructor_signature (identifier) @local.scope)
  (constant_constructor_signature (identifier) @local.scope)
  (factory_constructor_signature (identifier) @local.scope)
  (redirecting_factory_constructor_signature (identifier) @local.scope)
  (primary_constructor name: (identifier) @local.scope)
]
  (#set! local.scope-inherits false))

((cascade_selector (identifier) @local.scope) @_selector
  (#eq? @_selector @local.scope)
  (#set! local.scope-inherits false))

([
  (for_statement name: (identifier) @local.definition)
  (for_element name: (identifier) @local.definition)
]
  (#not-eq? @local.definition "_"))

(initialized_variable_definition
  name: (identifier) @local.definition)

(initialized_identifier
  (identifier) @local.definition)

(static_final_declaration
  (identifier) @local.definition)

(catch_clause
  exception: (identifier) @local.definition)

(catch_clause
  stack_trace: (identifier) @local.definition)

((function_signature
  name: (identifier) @local.definition)
  (#set! local.definition-scope "parent"))

((getter_signature
  name: (identifier) @local.definition)
  (#set! local.definition-scope "parent"))

((setter_signature
  name: (identifier) @local.definition)
  (#set! local.definition-scope "parent"))

(class_declaration
  name: (identifier) @local.definition)

(mixin_declaration
  (identifier) @local.definition)

(enum_declaration
  name: (identifier) @local.definition)

(extension_declaration
  name: (identifier) @local.definition)

((type_alias
  (type_identifier) @local.definition)
  (#set! local.definition-scope "parent"))

(type_parameter
  (type_identifier) @local.definition)

(import_specification
  alias: (identifier) @local.definition)

((variable_pattern
  name: (identifier) @local.definition)
  (#not-eq? @local.definition "_"))

(identifier) @local.reference
(type_identifier) @local.reference

(formal_parameter_list
  [
    (formal_parameter (identifier) @local.definition)
    (formal_parameter (constructor_param (identifier) @local.definition))
    (formal_parameter (super_formal_parameter (identifier) @local.definition))
    (optional_formal_parameters (formal_parameter (identifier) @local.definition))
    (optional_formal_parameters (formal_parameter (constructor_param (identifier) @local.definition)))
    (optional_formal_parameters (formal_parameter (super_formal_parameter (identifier) @local.definition)))
  ])

((class_declaration (primary_constructor) @local.scope-source body: (class_body (class_member (declaration ["static" "late"]* @_modifier (initialized_identifier_list (initialized_identifier value: (_) @local.scope-import))))))
  (#not-any-of? @_modifier "static" "late"))

((enum_declaration (primary_constructor) @local.scope-source body: (enum_body (class_member (declaration ["static" "late"]* @_modifier (initialized_identifier_list (initialized_identifier value: (_) @local.scope-import))))))
  (#not-any-of? @_modifier "static" "late"))

((class_declaration (primary_constructor parameters: (formal_parameter_list (formal_parameter ["final" "var"] (identifier) @local.definition))))
  (#set! local.definition-scope "parent"))

((class_declaration (primary_constructor parameters: (formal_parameter_list (optional_formal_parameters (formal_parameter ["final" "var"] (identifier) @local.definition)))))
  (#set! local.definition-scope "parent"))

((class_declaration (primary_constructor parameters: (formal_parameter_list (formal_parameter (constructor_param (identifier) @local.definition)))))
  (#set! local.definition-scope "parent"))

((class_declaration (primary_constructor parameters: (formal_parameter_list (optional_formal_parameters (formal_parameter (constructor_param (identifier) @local.definition))))))
  (#set! local.definition-scope "parent"))

((enum_declaration (primary_constructor parameters: (formal_parameter_list (formal_parameter ["final" "var"] (identifier) @local.definition))))
  (#set! local.definition-scope "parent"))

((enum_declaration (primary_constructor parameters: (formal_parameter_list (optional_formal_parameters (formal_parameter ["final" "var"] (identifier) @local.definition)))))
  (#set! local.definition-scope "parent"))

((enum_declaration (primary_constructor parameters: (formal_parameter_list (formal_parameter (constructor_param (identifier) @local.definition)))))
  (#set! local.definition-scope "parent"))

((enum_declaration (primary_constructor parameters: (formal_parameter_list (optional_formal_parameters (formal_parameter (constructor_param (identifier) @local.definition))))))
  (#set! local.definition-scope "parent"))

((extension_type_declaration (primary_constructor parameters: (formal_parameter_list (formal_parameter (identifier) @local.definition))))
  (#set! local.definition-scope "parent"))

((extension_type_declaration (primary_constructor parameters: (formal_parameter_list (optional_formal_parameters (formal_parameter (identifier) @local.definition)))))
  (#set! local.definition-scope "parent"))

((extension_type_declaration (primary_constructor parameters: (formal_parameter_list (formal_parameter (constructor_param (identifier) @local.definition)))))
  (#set! local.definition-scope "parent"))

((extension_type_declaration (primary_constructor parameters: (formal_parameter_list (optional_formal_parameters (formal_parameter (constructor_param (identifier) @local.definition))))))
  (#set! local.definition-scope "parent"))

(class_declaration (primary_constructor) body: (class_body (class_member (method_declaration signature: (method_signature (primary_constructor_body_signature (initializers) @local.scope))))))

(class_declaration (primary_constructor) @local.scope-source body: (class_body (class_member (method_declaration signature: (method_signature (primary_constructor_body_signature (initializers) @local.scope-import))))))

(class_declaration (primary_constructor) body: (class_body (class_member (declaration (primary_constructor_body_signature (initializers) @local.scope)))))

(class_declaration (primary_constructor) @local.scope-source body: (class_body (class_member (declaration (primary_constructor_body_signature (initializers) @local.scope-import)))))

((class_declaration
  (primary_constructor parameters: (formal_parameter_list (formal_parameter ["final" "var"]? @_field (identifier) @local.definition-predeclared)))
  body: (class_body
    (class_member
      (method_declaration
        signature: (method_signature (primary_constructor_body_signature))
        body: (function_body) @local.definition-region))))
  (#not-any-of? @_field "final" "var")
  (#set! local.definition-style "variable.parameter"))

((class_declaration
  (primary_constructor parameters: (formal_parameter_list (optional_formal_parameters (formal_parameter ["final" "var"]? @_field (identifier) @local.definition-predeclared))))
  body: (class_body
    (class_member
      (method_declaration
        signature: (method_signature (primary_constructor_body_signature))
        body: (function_body) @local.definition-region))))
  (#not-any-of? @_field "final" "var")
  (#set! local.definition-style "variable.parameter"))

(enum_declaration (primary_constructor) body: (enum_body (class_member (method_declaration signature: (method_signature (primary_constructor_body_signature (initializers) @local.scope))))))

(enum_declaration (primary_constructor) @local.scope-source body: (enum_body (class_member (method_declaration signature: (method_signature (primary_constructor_body_signature (initializers) @local.scope-import))))))

(enum_declaration (primary_constructor) body: (enum_body (class_member (declaration (primary_constructor_body_signature (initializers) @local.scope)))))

(enum_declaration (primary_constructor) @local.scope-source body: (enum_body (class_member (declaration (primary_constructor_body_signature (initializers) @local.scope-import)))))

((enum_declaration
  (primary_constructor parameters: (formal_parameter_list (formal_parameter ["final" "var"]? @_field (identifier) @local.definition-predeclared)))
  body: (enum_body
    (class_member
      (method_declaration
        signature: (method_signature (primary_constructor_body_signature))
        body: (function_body) @local.definition-region))))
  (#not-any-of? @_field "final" "var")
  (#set! local.definition-style "variable.parameter"))

((enum_declaration
  (primary_constructor parameters: (formal_parameter_list (optional_formal_parameters (formal_parameter ["final" "var"]? @_field (identifier) @local.definition-predeclared))))
  body: (enum_body
    (class_member
      (method_declaration
        signature: (method_signature (primary_constructor_body_signature))
        body: (function_body) @local.definition-region))))
  (#not-any-of? @_field "final" "var")
  (#set! local.definition-style "variable.parameter"))

((class_declaration
  (type_parameters
    (type_parameter (type_identifier) @local.definition-predeclared)+)) @local.definition-region
  (#set! local.definition-style "type.parameter"))

((mixin_application_class
  (type_parameters
    (type_parameter (type_identifier) @local.definition-predeclared)+)) @local.definition-region
  (#set! local.definition-style "type.parameter"))

((mixin_declaration
  (type_parameters
    (type_parameter (type_identifier) @local.definition-predeclared)+)) @local.definition-region
  (#set! local.definition-style "type.parameter"))

((enum_declaration
  (type_parameters
    (type_parameter (type_identifier) @local.definition-predeclared)+)) @local.definition-region
  (#set! local.definition-style "type.parameter"))

((extension_declaration
  (type_parameters
    (type_parameter (type_identifier) @local.definition-predeclared)+)) @local.definition-region
  (#set! local.definition-style "type.parameter"))

((extension_type_declaration
  (type_parameters
    (type_parameter (type_identifier) @local.definition-predeclared)+)) @local.definition-region
  (#set! local.definition-style "type.parameter"))

((type_alias
  (type_parameters
    (type_parameter (type_identifier) @local.definition-predeclared)+)) @local.definition-region
  (#set! local.definition-style "type.parameter"))

((function_signature
  (type_parameters
    (type_parameter (type_identifier) @local.definition-predeclared)+)) @local.definition-region
  (#set! local.definition-style "type.parameter"))

((function_type
  (type_parameters
    (type_parameter (type_identifier) @local.definition-predeclared)+)) @local.definition-region
  (#set! local.definition-style "type.parameter"))

((function_expression
  (type_parameters
    (type_parameter (type_identifier) @local.definition-predeclared)+)) @local.definition-region
  (#set! local.definition-style "type.parameter"))

((formal_parameter
  (type_parameters
    (type_parameter (type_identifier) @local.definition-predeclared)+)) @local.definition-region
  (#set! local.definition-style "type.parameter"))

((constructor_param
  (type_parameters
    (type_parameter (type_identifier) @local.definition-predeclared)+)) @local.definition-region
  (#set! local.definition-style "type.parameter"))

((super_formal_parameter
  (type_parameters
    (type_parameter (type_identifier) @local.definition-predeclared)+)) @local.definition-region
  (#set! local.definition-style "type.parameter"))
