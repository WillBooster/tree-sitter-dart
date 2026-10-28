; locals.scm - Dart scope and variable resolution queries

; ============================================================================
; Scopes
; ============================================================================

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

((formal_parameter
  (identifier) @local.definition
  (formal_parameter_list)) @local.scope
  (#set! local.definition-scope "parent"))

((constructor_param
  (identifier) @local.definition
  (formal_parameter_list)) @local.scope
  (#set! local.definition-scope "parent"))

((super_formal_parameter
  (identifier) @local.definition
  (formal_parameter_list)) @local.scope
  (#set! local.definition-scope "parent"))

(function_type) @local.scope

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

; ============================================================================
; Definitions
; ============================================================================

; Variables
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

; Parameters
(formal_parameter
  (identifier) @local.definition .)

(constructor_param
  (identifier) @local.definition .)

(super_formal_parameter
  (identifier) @local.definition .)

; Catch variables
(catch_clause
  exception: (identifier) @local.definition)

(catch_clause
  stack_trace: (identifier) @local.definition)

; Functions
((function_signature
  name: (identifier) @local.definition)
  (#set! local.definition-scope "parent"))

((getter_signature
  name: (identifier) @local.definition)
  (#set! local.definition-scope "parent"))

((setter_signature
  name: (identifier) @local.definition)
  (#set! local.definition-scope "parent"))

; Types
(class_declaration
  name: (identifier) @local.definition)

(mixin_declaration
  (identifier) @local.definition)

(enum_declaration
  name: (identifier) @local.definition)

(extension_declaration
  name: (identifier) @local.definition)

(type_alias
  (type_identifier) @local.definition)

(type_parameter
  (type_identifier) @local.definition)

; Import aliases
(import_specification
  alias: (identifier) @local.definition)

; Pattern bindings (Dart 3.0)
((variable_pattern
  name: (identifier) @local.definition)
  (#not-eq? @local.definition "_"))

; ============================================================================
; References
; ============================================================================

(identifier) @local.reference
(type_identifier) @local.reference
