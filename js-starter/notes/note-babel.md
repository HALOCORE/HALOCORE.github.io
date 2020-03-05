```js
function statementBreaksInjector({ types: t }) {
  return {
    visitor: {
      ExpressionStatement(path) {
        let exprType = path.node.expression.type;
        let loc = path.node.expression.loc;
        if (loc === undefined) return;
        if(exprType === 'AssignmentExpression' || exprType === 'CallExpression') {
            console.log("Visit Expression Type: ", exprType, ", loc: ", loc);
            path.insertBefore(t.yieldExpression(
                t.callExpression(t.identifier("_debug_break"), 
                [t.numericLiteral(loc['start']['line']), t.numericLiteral(loc['end']['line'])])
                ), false);
        } else {
          console.log("UNKNOWN Expression Type:", exprType, ", loc: ", loc);
        }
      }
    }
  };
}
var inputCode = `
let a = inputNumber("请输入a", 0);
let sum = 0;
for(let i = 1; i <= a; i++) {
  sum = sum + i;
  if (Math.floor(sum / 2) === sum / 2) 
  {
    print("偶数sum", sum);
  }
  else
  {
    print("奇数sum", sum);
  }
}
print("最终和为", sum);
`;
const result = Babel.transform(inputCode, {
  plugins: [statementBreaksInjector]
});
print(result.code);
```


```json
  {
    "type": "CallExpression",
    "start": 181,
    "end": 200,
    "loc": {
      "start": {
        "line": 12,
        "column": 4
      },
      "end": {
        "line": 12,
        "column": 23
      }
    },
    "callee": {
      "type": "Identifier",
      "start": 181,
      "end": 186,
      "loc": {
        "start": {
          "line": 12,
          "column": 4
        },
        "end": {
          "line": 12,
          "column": 9
        },
        "identifierName": "print"
      },
      "name": "print"
    },
    "arguments": [
      {
        "type": "StringLiteral",
        "start": 187,
        "end": 194,
        "loc": {
          "start": {
            "line": 12,
            "column": 10
          },
          "end": {
            "line": 12,
            "column": 17
          }
        },
        "extra": {
          "rawValue": "奇数sum",
          "raw": "\"奇数sum\""
        },
        "value": "奇数sum"
      },
      {
        "type": "Identifier",
        "start": 196,
        "end": 199,
        "loc": {
          "start": {
            "line": 12,
            "column": 19
          },
          "end": {
            "line": 12,
            "column": 22
          },
          "identifierName": "sum"
        },
        "name": "sum"
      }
    ]
  }

```

```json
  {
    "type": "AssignmentExpression",
    "start": 78,
    "end": 91,
    "loc": {
      "start": {
        "line": 5,
        "column": 2
      },
      "end": {
        "line": 5,
        "column": 15
      }
    },
    "operator": "=",
    "left": {
      "type": "Identifier",
      "start": 78,
      "end": 81,
      "loc": {
        "start": {
          "line": 5,
          "column": 2
        },
        "end": {
          "line": 5,
          "column": 5
        },
        "identifierName": "sum"
      },
      "name": "sum"
    },
    "right": {
      "type": "BinaryExpression",
      "start": 84,
      "end": 91,
      "loc": {
        "start": {
          "line": 5,
          "column": 8
        },
        "end": {
          "line": 5,
          "column": 15
        }
      },
      "left": {
        "type": "Identifier",
        "start": 84,
        "end": 87,
        "loc": {
          "start": {
            "line": 5,
            "column": 8
          },
          "end": {
            "line": 5,
            "column": 11
          },
          "identifierName": "sum"
        },
        "name": "sum"
      },
      "operator": "+",
      "right": {
        "type": "Identifier",
        "start": 90,
        "end": 91,
        "loc": {
          "start": {
            "line": 5,
            "column": 14
          },
          "end": {
            "line": 5,
            "column": 15
          },
          "identifierName": "i"
        },
        "name": "i"
      }
    }
  }

```