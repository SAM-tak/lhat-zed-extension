(function_expression body: (block (_)* @function.inside)) @function.around
(definition_expression body: (definition_body (_)* @class.inside)) @class.around
[(line_comment) (block_comment)] @comment.around
