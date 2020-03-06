var _maincodeEditor;
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
function _debugCodeGen(codes) {
    function statementBreaksInjector({ types: t }) {
        return {
            visitor: {
                ExpressionStatement(path) {
                    let exprType = path.node.expression.type;
                    let loc = path.node.expression.loc;
                    if (loc === undefined) return;
                    if (exprType === 'AssignmentExpression' || exprType === 'CallExpression') {
                        console.log("Visit Expression Type: ", exprType, ", loc: ", loc);
                        path.insertBefore(t.yieldExpression(
                            t.callExpression(t.identifier("_debug_break"),
                                [t.numericLiteral(loc['start']['line']), t.numericLiteral(loc['start']['column']), 
                                t.numericLiteral(loc['end']['line']), t.numericLiteral(loc['end']['column'])])
                        ), false);
                    } else {
                        console.log("UNKNOWN Expression Type:", exprType, ", loc: ", loc);
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

let _debugInterval = 100;
let _debugIterator = null;
let _DEBUG_MODE_READY = "READY";
let _DEBUG_MODE_RUN = "RUN";
let _DEBUG_MODE_PAUSE = "PAUSE";
let _DEBUG_MODE_PAUSED = "PAUSED";
let _DEBUG_MODE_STEP = "STEP";
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
}

let _debug_lastMarker = null;
function _debug_break(lineStart, colStart, lineEnd, colEnd) {
    console.log("_debug_break AT:", lineStart, lineEnd);
    if(_debug_lastMarker !== null) _debug_lastMarker.clear();
    _debug_lastMarker = _maincodeEditor.markText(
        {line:lineStart - 1,ch:colStart},
        {line:lineEnd - 1,ch:colEnd},
        {className:"debug-break-running-code"});
    //console.log(_debug_lastMarker);
}

function _debug_leave() {
    if(_debug_lastMarker !== null) _debug_lastMarker.clear();
    debugMode = _DEBUG_MODE_EXITED;
    print("[INFO] 退出调试模式.");
    document.querySelector("#maincode-run-button").disabled = false;
    document.querySelector("#debugcode-begin-button").disabled = false;
    document.querySelector("#debugger-run-pause-button").disabled = true;
    document.querySelector("#debugger-run-pause-button").innerText = "Run";
    document.querySelector("#debugger-step-button").disabled = true;
    document.querySelector("#debugcode-exit-button").disabled = true;
}

function _debugIteratorHandler() {
    if(_debugModeIs(_DEBUG_MODE_READY, _DEBUG_MODE_PAUSED, _DEBUG_MODE_EXITED)) {
        console.warn("# DEBUG STATE WARNING: should not iterate state. " + _debugMode);
        return;
    }
    if(_debugModeIs(_DEBUG_MODE_PAUSE)) {
        _debugMode = _DEBUG_MODE_PAUSED;
        return;
    }
    if(_debugModeIs(_DEBUG_MODE_EXIT)) {
        _debug_leave();
        return;
    }
    if(!_debugModeIs(_DEBUG_MODE_RUN, _DEBUG_MODE_STEP)) {
        print("[ERROR] unexpected debug state before step execution: " + _debugMode);
        _debug_leave();
        return;
    }
    //execute step
    let yieldVal = null;
    try{
        yieldVal = _debugIterator.next();
    } catch(e) {
        print("[ERROR] " + e.message);
        console.error("debug execution error:", e);
        _debug_leave();
        return;
    }
    if (yieldVal !== null && yieldVal.done === false) {
        if(_debugModeIs(_DEBUG_MODE_RUN)) {
            setTimeout(_debugIteratorHandler, _debugInterval);
            return;
        }
        if(_debugModeIs(_DEBUG_MODE_STEP)) {
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