var _maincodeEditor;
let _debugInterval = 100;

window.onload = () => {
    _maincodeEditor = CodeMirror.fromTextArea(document.getElementById("maincode-input"), {
        lineNumbers: true,
        readOnly: false,
        styleActiveLine: true,
        matchBrackets: true
    });
    document.querySelector("#maincode-run-button").disabled = false;
    document.querySelector("#debugcode-begin-button").disabled = false;
    document.querySelector("#clear-log-button").disabled = false;
    document.querySelector("#loading-text").style.display = "none";

    let intervalSel = document.querySelector("#debugger-interval-select");
    let intervalUpdater = () => {
        _debugInterval = parseInt(intervalSel.value);
        console.log("# update _debugInterval: ", _debugInterval);
    };
    intervalSel.addEventListener("change", intervalUpdater);
    intervalUpdater();
}

function print() {
    let msgbd = document.querySelector("#msg-board");
    let elem = document.createElement("div");
    let numargs = arguments.length;
    let msgstr = "";
    for (let i = 0; i < numargs; i++) msgstr += arguments[i].toString() + " ";
    elem.innerText = msgstr;
    if (msgstr.indexOf("[INFO]") >= 0) elem.style.color = "blue";
    if (msgstr.indexOf("[OK]") >= 0) elem.style.color = "green";
    if (msgstr.indexOf("[WARN]") >= 0) elem.style.color = "orange";
    if (msgstr.indexOf("[ERROR]") >= 0) elem.style.color = "red";
    msgbd.appendChild(elem);
    msgbd.scrollTop = msgbd.scrollHeight;
}

function inputNumber(msg, defaultValue) {
    let a = prompt(msg, defaultValue.toString());
    try {
        a = parseFloat(a);
    } catch (e) {
        alert("输入的不是数值，程序结束");
        throw e;
    }
    return a;
}

function inputString(msg, defaultValue) {
    let a = prompt(msg, defaultValue.toString());
    return a;
}

function codeCheck(codes) {
    if (codes.indexOf("，") >= 0) {
        print("[WARN] 发现中文逗号\"，\". 如果中文符号在注释里可忽略.");
    }
    if (codes.indexOf("：") >= 0) {
        print("[WARN] 发现中文冒号\"：\". 如果中文符号在注释里可忽略.");
    }
    if (codes.indexOf("；") >= 0) {
        print("[WARN] 发现中文分号\"；\". 如果中文符号在注释里可忽略.");
    }
    if (codes.indexOf("“") >= 0 || codes.indexOf("”") >= 0) {
        print("[WARN] 发现中文引号\"“ ”\". 如果中文符号在注释里可忽略.");
    }
}

///////////////////////////// DEBUG CORE BEGIN /////////////////////////////
let _debug_break_variable_dict = null;
function _debugCodeGen(codes) {
    function statementBreaksInjector({ types: t }) {
        let breakCounter = 0;
        _debug_break_variable_dict = {};
        return {
            visitor: {
                ExpressionStatement(path) {
                    let exprType = path.node.expression.type;
                    let loc = path.node.expression.loc;
                    if (loc === undefined) return;
                    let refs = path.hub.file.scope.references;
                    if (exprType === 'AssignmentExpression' || exprType === 'CallExpression' || exprType === 'UpdateExpression') {
                        console.log("Visit Expression Type: ", exprType, ", loc: ", loc);
                        _debug_break_variable_dict[breakCounter] = [];
                        for (let r in refs) {
                            if (path.scope.hasBinding(r)) _debug_break_variable_dict[breakCounter].push(r);
                        }
                        path.insertBefore(t.yieldExpression(
                            t.callExpression(t.identifier("_debug_break"),
                                [t.numericLiteral(breakCounter),
                                t.numericLiteral(loc['start']['line']), t.numericLiteral(loc['start']['column']),
                                t.numericLiteral(loc['end']['line']), t.numericLiteral(loc['end']['column']),
                                t.arrowFunctionExpression([t.identifier("x")], t.callExpression(
                                    t.identifier("eval"), [t.identifier("x")]
                                ))])
                        ), false);
                        breakCounter++;
                    } else {
                        console.warn("UNKNOWN Expression Type:", exprType, ", loc: ", loc);
                    }
                }
            }
        };
    }
    const result = Babel.transform(codes, {
        plugins: [statementBreaksInjector]
    });
    let finalCode = "(function* _debug_generator(){\n  CODES \n})".replace("CODES", result.code);
    console.log("=========== DEBUG CODE ===========");
    console.log(finalCode);
    let dgen = eval(finalCode);
    return dgen;
}

let _debugIterator = null;
let _DEBUG_MODE_READY = "READY";
let _DEBUG_MODE_RUN = "RUN";
let _DEBUG_MODE_PAUSE = "PAUSE";
let _DEBUG_MODE_PAUSED = "PAUSED";
let _DEBUG_MODE_STEP = "STEP";
let _DEBUG_MODE_ERROR = "ERROR";
let _DEBUG_MODE_EXIT = "EXIT";
let _DEBUG_MODE_EXITED = "EXITED";
let _debugMode = _DEBUG_MODE_EXITED;

function _debugModeIs() {
    let numargs = arguments.length;
    for (let i = 0; i < numargs; i++) {
        if (_debugMode === arguments[i]) return true;
    }
    return false;
}

function _debug_enter() {
    _debugMode = _DEBUG_MODE_READY;
    print("[INFO] 进入调试模式.");
    document.querySelector("#maincode-run-button").disabled = true;
    document.querySelector("#debugcode-begin-button").disabled = true;
    document.querySelector("#debugger-run-pause-button").disabled = false;
    document.querySelector("#debugger-step-button").disabled = false;
    document.querySelector("#debugcode-exit-button").disabled = false;
    document.querySelector("#debug-variable-display-wrapper").style.display = "block";
}

let _debug_lastMarker = null;
let _debug_evaluator = null;

function _debug_break_vars_display(varsvals) {
    let tbody = document.querySelector("#debug-variable-table-body");
    tbody.innerHTML = "";
    for (let key in varsvals) {
        let tr = document.createElement("tr");
        let td1 = document.createElement("td");
        let td2 = document.createElement("td");
        td1.textContent = key;
        td2.textContent = varsvals[key];
        tr.appendChild(td1);
        tr.appendChild(td2);
        tbody.appendChild(tr);
    }
}

function _debug_break_vars_eval(vars) {
    if (vars === undefined || vars === null) {
        console.warn("_debug_break_vars_eval vars info not exist.");
        return;
    }
    let varsvals = {};
    for (let i = 0; i < vars.length; i++) {
        let varName = vars[i];
        try {
            let varVal = _debug_evaluator(varName);
            varsvals[varName] = varVal;
        } catch (e) { }
    }
    console.log("_debug_break_vars_eval: ", varsvals);
    _debug_break_vars_display(varsvals);
}
function _debug_break(breakId, lineStart, colStart, lineEnd, colEnd, evaluator) {
    console.log("_debug_break[" + breakId + "]" + " AT:", lineStart, lineEnd);
    if (_debug_lastMarker !== null) _debug_lastMarker.clear();
    _debug_lastMarker = _maincodeEditor.markText(
        { line: lineStart - 1, ch: colStart },
        { line: lineEnd - 1, ch: colEnd },
        { className: "debug-break-running-code" });
    _debug_evaluator = evaluator;
    let varNames = _debug_break_variable_dict[breakId];
    _debug_break_vars_eval(varNames);
}

function _debug_leave() {
    if (_debug_lastMarker !== null) _debug_lastMarker.clear();
    debugMode = _DEBUG_MODE_EXITED;
    print("[INFO] 退出调试模式.");
    document.querySelector("#maincode-run-button").disabled = false;
    document.querySelector("#debugcode-begin-button").disabled = false;
    document.querySelector("#debugger-run-pause-button").disabled = true;
    document.querySelector("#debugger-run-pause-button").innerText = "Run";
    document.querySelector("#debugger-step-button").disabled = true;
    document.querySelector("#debugcode-exit-button").disabled = true;
    document.querySelector("#debug-variable-display-wrapper").style.display = "none";
    document.querySelector("#debug-variable-table-body").innerHTML = "";
}

function _debug_error() {
    debugMode = _DEBUG_MODE_ERROR;
    document.querySelector("#debugger-run-pause-button").disabled = true;
    document.querySelector("#debugger-step-button").disabled = true;
    document.querySelector("#debugcode-exit-button").disabled = false;
}

function _debugIteratorHandler() {
    if (_debugModeIs(_DEBUG_MODE_READY, _DEBUG_MODE_PAUSED, _DEBUG_MODE_EXITED)) {
        console.warn("# DEBUG STATE WARNING: should not iterate state. " + _debugMode);
        return;
    }
    if (_debugModeIs(_DEBUG_MODE_PAUSE)) {
        _debugMode = _DEBUG_MODE_PAUSED;
        return;
    }
    if (_debugModeIs(_DEBUG_MODE_EXIT)) {
        _debug_leave();
        return;
    }
    if (!_debugModeIs(_DEBUG_MODE_RUN, _DEBUG_MODE_STEP)) {
        print("[ERROR] unexpected debug state before step execution: " + _debugMode);
        _debug_leave();
        return;
    }
    //execute step
    let yieldVal = null;
    try {
        yieldVal = _debugIterator.next();
    } catch (e) {
        print("[ERROR] " + e.message);
        console.error("debug execution error:", e);
        _debug_error();
        return;
    }
    if (yieldVal !== null && yieldVal.done === false) {
        if (_debugModeIs(_DEBUG_MODE_RUN)) {
            setTimeout(_debugIteratorHandler, _debugInterval);
            return;
        }
        if (_debugModeIs(_DEBUG_MODE_STEP)) {
            _debugMode = _DEBUG_MODE_PAUSED;
            return;
        }
        print("[ERROR] unexpected debug state after step execution: " + _debugMode);
        _debug_leave();
        return;
    } else {
        _debug_leave();
    }
}

function debugmodeEnter() {
    let tarea = document.getElementById("maincode-input");
    tarea.value = _maincodeEditor.getValue();
    let codes = tarea.value;
    codeCheck(codes);
    document.querySelector("#last-code-board").innerText = codes;
    console.log(codes);
    try {
        let dgen = _debugCodeGen(codes);
        _debugIterator = dgen();
        print("[OK] 调试模式初始化成功.");
        _debugMode = _DEBUG_MODE_READY;
        _debug_enter();

    } catch (e) {
        print("[ERROR] 调试模式初始化失败: " + e.message);
        console.log(e);
    }
}

function debuggerRunPause() {
    if (_debugModeIs(_DEBUG_MODE_RUN)) {
        _debugMode = _DEBUG_MODE_PAUSE;
        document.querySelector("#debugger-run-pause-button").innerText = "Run";
        document.querySelector("#debugger-step-button").disabled = false;
        return;
    }
    if (_debugModeIs(_DEBUG_MODE_READY, _DEBUG_MODE_PAUSED)) {
        _debugMode = _DEBUG_MODE_RUN;
        _debugIteratorHandler();
        document.querySelector("#debugger-run-pause-button").innerText = "Pause";
        document.querySelector("#debugger-step-button").disabled = true;
        return;
    }
    console.warn("debuggerRunPause: not appropriate to execute: " + _debugMode);
}

function debuggerStep() {
    if (!_debugModeIs(_DEBUG_MODE_READY, _DEBUG_MODE_PAUSED)) {
        console.warn("debuggerStep: not appropriate to execute: " + _debugMode);
        return;
    }
    _debugMode = _DEBUG_MODE_STEP;
    _debugIteratorHandler();
}

function debuggerExit() {
    if (_debugModeIs(_DEBUG_MODE_EXITED)) {
        console.warn("debuggerExit: debugger already exited: " + _debugMode);
        return;
    }
    _debugMode = _DEBUG_MODE_EXIT;
    if (!_debugModeIs(_DEBUG_MODE_RUN)) {
        _debugIteratorHandler();
    }
}

///////////////////////////// DEBUG CORE END /////////////////////////////

function maincodeRun() {
    let tarea = document.getElementById("maincode-input");
    tarea.value = _maincodeEditor.getValue();
    let codes = tarea.value;
    codeCheck(codes);
    document.querySelector("#last-code-board").innerText = codes;
    console.log(codes);
    try {
        print("[INFO] 运行开始.");
        eval(codes);
        print("[OK] 运行成功.");
    } catch (e) {
        print("[ERROR] " + e.message);
        print("[ERROR] 运行出错结束.");
        console.log(e);
    }
}

function logClearRun() {
    let msgbd = document.querySelector("#msg-board");
    msgbd.innerHTML = "";
    msgbd.scrollTop = msgbd.scrollHeight;
}