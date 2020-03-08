"use strict";
let jsStarterVersion = "v0.8";

///////////////////////////// USER BEGIN /////////////////////////////
let _print_msgbd = document.querySelector("#msg-board");
let _print_scroll_counter = 0;
function print() {
    let elem = document.createElement("div");
    let numargs = arguments.length;
    let msgstr = "";
    for (let i = 0; i < numargs; i++) msgstr += arguments[i].toString() + " ";
    elem.innerText = msgstr;
    console.log("**print** " + msgstr);
    if (msgstr.startsWith("[INFO]")) elem.style.color = "blue";
    if (msgstr.startsWith("[OK]")) elem.style.color = "green";
    if (msgstr.startsWith("[WARN]")) elem.style.color = "orange";
    if (msgstr.startsWith("[ERROR]")) elem.style.color = "red";
    _print_msgbd.appendChild(elem);
    _print_scroll_counter++;
    setTimeout(() => {
        _print_scroll_counter--;
        if (_print_scroll_counter === 0) _print_msgbd.scrollTop = _print_msgbd.scrollHeight;
    }, 0);
}

function inputNumber(msg, defaultValue = 0) {
    let a = prompt(msg, defaultValue.toString());
    try {
        a = parseFloat(a);
    } catch (e) {
        alert("输入的不是数值，程序结束");
        throw e;
    }
    return a;
}

function inputString(msg, defaultValue = "") {
    let a = prompt(msg, defaultValue.toString());
    return a;
}
///////////////////////////// USER END /////////////////////////////

let _maincodeEditor;
let _debugInterval = 100;

let _breakpoint_default_opacity = 1.0;
let _breakpoint_invalid_opacity = 0.3;
window.onload = () => {
    _maincodeEditor = CodeMirror.fromTextArea(document.getElementById("maincode-input"), {
        lineNumbers: true,
        readOnly: false,
        styleActiveLine: true,
        matchBrackets: true,
        gutters: ["CodeMirror-linenumbers", "breakpoints"],
        hintOptions: { "completeSingle": false }
    });
    function makeBreakpointMarker() {
        var marker = document.createElement("div");
        marker.style.color = "#822";
        marker.style.opacity = _breakpoint_default_opacity;
        marker.style.position = "relative";
        marker.style.left = "-30px";
        marker.innerHTML = "●";
        return marker;
    }
    _maincodeEditor.on("gutterClick", function (cm, n) {
        var info = cm.lineInfo(n);
        cm.setGutterMarker(n, "breakpoints", info.gutterMarkers ? null : makeBreakpointMarker());
        _updateBreakpoints();
    });
    function ignoreToken(token) {
        let charCode = token[0].charCodeAt();
        if (charCode >= "a".charCodeAt() && charCode <= "z".charCodeAt()) return false;
        if (charCode >= "A".charCodeAt() && charCode <= "Z".charCodeAt()) return false;
        if (charCode === "_".charCodeAt() || charCode === ".".charCodeAt()) return false;
        return true;
    }
    let autocompleteCounter = 0;
    _maincodeEditor.on("change", function (editor, change) {
        if (change.origin == "+input") {
            if (!ignoreToken(change.text)) {
                console.log(change.text);
                autocompleteCounter++;
                setTimeout(function () {
                    autocompleteCounter--;
                    if (autocompleteCounter > 0) return;
                    editor.execCommand("autocomplete");
                }, 50);
            }
        };
    });

    document.querySelector("#maincode-run-button").disabled = false;
    document.querySelector("#debugcode-begin-button").disabled = false;
    document.querySelector("#clear-log-button").disabled = false;
    document.querySelector("#loading-text").innerText = jsStarterVersion;

    let intervalSel = document.querySelector("#debugger-interval-select");
    let intervalUpdater = () => {
        _debugInterval = parseInt(intervalSel.value);
        console.log("# update _debugInterval: ", _debugInterval);
    };
    intervalSel.addEventListener("change", intervalUpdater);
    intervalUpdater();
}

function __codeCheck(codes) {
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
function _lineno_babel2cm(lineno) { return lineno - 2; }
function _lineno_cm2babel(lineno) { return lineno + 2; }

let _breakpoint_debug_lineno_dict = null;
let _debug_break_lineno_dict = null;
function _updateBreakpoints() {
    let lineCount = _maincodeEditor.doc.size;
    if (!_isInDebugMode()) {
        if (_breakpoint_debug_lineno_dict === null) {
            console.log("_updateBreakpoints EDIT MODE ignored.");
        } else {
            console.log("_updateBreakpoints EDIT MODE.");
            for (let i = 0; i < lineCount; i++) {
                let info = _maincodeEditor.lineInfo(i);
                if (info.gutterMarkers) {
                    if (info.gutterMarkers.breakpoints) {
                        info.gutterMarkers.breakpoints.style.opacity = _breakpoint_default_opacity;
                    }
                }
            }
        }
    } else {
        console.log("_updateBreakpoints DEBUG MODE.");
        _breakpoint_debug_lineno_dict = {};
        for (let i = 0; i < lineCount; i++) {
            let info = _maincodeEditor.lineInfo(i);
            if (info.gutterMarkers) {
                if (info.gutterMarkers.breakpoints) {
                    _breakpoint_debug_lineno_dict[_lineno_cm2babel(i)] = true;
                    if (_debug_break_lineno_dict[_lineno_cm2babel(i)] === true) {
                        info.gutterMarkers.breakpoints.style.opacity = _breakpoint_default_opacity;
                    } else {
                        info.gutterMarkers.breakpoints.style.opacity = _breakpoint_invalid_opacity;
                    }
                }
            }
        }
    }
}

let _debug_break_variable_dict = null;
let _debug_break_dedup_dict = null;
function _debugCodeGen(codes) {
    let breakCounter = 0;
    _debug_break_variable_dict = {};
    _debug_break_dedup_dict = {};
    _debug_break_lineno_dict = {};
    let functionLevelCounter = 0;
    function registerBreakpoint(loc) {
        let breakPointSig = loc['start']['line'] + "-" + loc['start']['column'] +
            "-" + loc['end']['line'] + "-" + loc['end']['column'];
        if (breakPointSig in _debug_break_dedup_dict) return false;
        _debug_break_dedup_dict[breakPointSig] = true;
        _debug_break_lineno_dict[loc['start']['line']] = true;
        return true;
    }
    let avoidedNodes = [];
    function isAvoidedNodes (node) {
        for(let i = 0; i < avoidedNodes.length; i++) {
            if (avoidedNodes[i] === node) return true;
        }
        return false;
    }
    function addYieldBreakIfNotYet(path, t, loc, refs) {
        if (!(registerBreakpoint(loc))) return;
        _debug_break_variable_dict[breakCounter] = [];
        for (let r in refs) {
            if (path.scope.hasBinding(r)) _debug_break_variable_dict[breakCounter].push(r);
        }
        path.insertBefore(t.ExpressionStatement(t.yieldExpression(
            t.callExpression(t.identifier("_debug_break"),
                [t.numericLiteral(breakCounter),
                t.numericLiteral(loc['start']['line']), t.numericLiteral(loc['start']['column']),
                t.numericLiteral(loc['end']['line']), t.numericLiteral(loc['end']['column']),
                t.arrowFunctionExpression([t.identifier("x")], t.callExpression(
                    t.identifier("eval"), [t.identifier("x")]
                ))])
        )), false);
        breakCounter++;
    }
    function statementBreaksInjector({ types: t }) {
        return {
            visitor: {
                VariableDeclaration(path) {
                    if (functionLevelCounter > 0) return;
                    if (isAvoidedNodes(path.node)) return;
                    let loc = path.node.loc;
                    if (loc === undefined) return;
                    if (path.node.kind !== 'let') return;
                    let refs = path.hub.file.scope.references;
                    addYieldBreakIfNotYet(path, t, loc, refs);
                },
                ForStatement(path) {
                    avoidedNodes.push(path.node.init);
                    avoidedNodes.push(path.node.update);
                },
                ExpressionStatement(path) {
                    if (functionLevelCounter > 0) return;
                    let exprType = path.node.expression.type;
                    let loc = path.node.loc;
                    if (loc === undefined) return;
                    let refs = path.hub.file.scope.references;
                    if (exprType === 'StringLiteral' || exprType === 'NumericLiteral') {
                        console.log("Ignored Expression Type:", exprType, ", loc: ", loc);
                    } else {
                        console.log("Visit Expression Type: ", exprType, ", loc: ", loc);
                        addYieldBreakIfNotYet(path, t, loc, refs);
                    }
                },
                FunctionDeclaration: {
                    enter(path) {
                        functionLevelCounter++;
                        console.log("# ENTER function. LEVEL: " + functionLevelCounter);
                    },
                    exit(path) {
                        functionLevelCounter--;
                        console.log("# EXIT function. LEVEL: " + functionLevelCounter);
                    }
                },
                ArrowFunctionExpression: {
                    enter(path) {
                        functionLevelCounter++;
                        console.log("# ENTER arraw function. LEVEL: " + functionLevelCounter);
                    },
                    exit(path) {
                        functionLevelCounter--;
                        console.log("# EXIT arraw function. LEVEL: " + functionLevelCounter);
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

function _isInDebugMode() { return _debugMode !== _DEBUG_MODE_EXITED; }
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
    document.querySelector("#debugger-control-zone").classList.add("debugger-normal");
    _maincodeEditor.options.readOnly = true;
    _updateBreakpoints();
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
        let val = varsvals[key];
        if (typeof val === 'function') {
            td2.style.color = "blue";
            val = "function";
        }
        else if (typeof val === 'string') {
            td2.style.color = "brown";
        }
        td2.textContent = val;
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
    _debug_break_vars_display(varsvals);
}
function _debug_break(breakId, lineStart, colStart, lineEnd, colEnd, evaluator) {
    console.log("_debug_break[" + breakId + "]" + " AT:", lineStart, lineEnd);
    if (_debug_lastMarker !== null) _debug_lastMarker.clear();
    _debug_lastMarker = _maincodeEditor.markText(
        { line: _lineno_babel2cm(lineStart), ch: colStart },
        { line: _lineno_babel2cm(lineEnd), ch: colEnd },
        { className: "debug-break-running-code" });
    _debug_evaluator = evaluator;
    let varNames = _debug_break_variable_dict[breakId];
    _debug_break_vars_eval(varNames);
    return lineStart;
}

function _debug_pause() {
    if (!_debugModeIs(_DEBUG_MODE_RUN)) {
        console.error("call _debug_pause while not _DEBUG_MODE_RUN: " + _debugMode);
        return;
    }
    _debugMode = _DEBUG_MODE_PAUSE;
    document.querySelector("#debugger-run-pause-button").innerText = "Run";
    document.querySelector("#debugger-step-button").disabled = false;
}

function _debug_leave() {
    if (_debug_lastMarker !== null) _debug_lastMarker.clear();
    _debugMode = _DEBUG_MODE_EXITED;
    print("[INFO] 退出调试模式.");
    document.querySelector("#maincode-run-button").disabled = false;
    document.querySelector("#debugcode-begin-button").disabled = false;
    document.querySelector("#debugger-run-pause-button").disabled = true;
    document.querySelector("#debugger-run-pause-button").innerText = "Run";
    document.querySelector("#debugger-step-button").disabled = true;
    document.querySelector("#debugcode-exit-button").disabled = true;
    document.querySelector("#debug-variable-display-wrapper").style.display = "none";
    document.querySelector("#debug-variable-table-body").innerHTML = "";
    document.querySelector("#debugger-control-zone").classList.remove("debugger-normal", "debugger-error");
    _maincodeEditor.options.readOnly = false;
    _updateBreakpoints();
}

function _debug_error() {
    _debugMode = _DEBUG_MODE_ERROR;
    document.querySelector("#debugger-run-pause-button").disabled = true;
    document.querySelector("#debugger-step-button").disabled = true;
    document.querySelector("#debugcode-exit-button").disabled = false;
    document.querySelector("#debugger-control-zone").classList.add("debugger-error");
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
            let val = yieldVal.value;
            if (_breakpoint_debug_lineno_dict && _breakpoint_debug_lineno_dict[val] === true) {
                _debug_pause();
            }
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
        console.log("debug execution finish.");
        _debug_leave();
    }
}

function __debugmodeEnter() {
    let tarea = document.getElementById("maincode-input");
    tarea.value = _maincodeEditor.getValue();
    let codes = "\"use strict\";\n" + tarea.value;
    __codeCheck(codes);
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

function __debuggerRunPause() {
    if (_debugModeIs(_DEBUG_MODE_RUN)) {
        _debug_pause();
        return;
    }
    if (_debugModeIs(_DEBUG_MODE_READY, _DEBUG_MODE_PAUSED)) {
        _debugMode = _DEBUG_MODE_RUN;
        document.querySelector("#debugger-run-pause-button").innerText = "Pause";
        document.querySelector("#debugger-step-button").disabled = true;
        _debugIteratorHandler();
        return;
    }
    console.warn("__debuggerRunPause: not appropriate to execute: " + _debugMode);
}

function __debuggerStep() {
    if (!_debugModeIs(_DEBUG_MODE_READY, _DEBUG_MODE_PAUSED)) {
        console.warn("__debuggerStep: not appropriate to execute: " + _debugMode);
        return;
    }
    _debugMode = _DEBUG_MODE_STEP;
    _debugIteratorHandler();
}

function __debuggerExit() {
    if (_debugModeIs(_DEBUG_MODE_EXITED)) {
        console.warn("__debuggerExit: debugger already exited: " + _debugMode);
        return;
    }
    _debugMode = _DEBUG_MODE_EXIT;
    if (!_debugModeIs(_DEBUG_MODE_RUN)) {
        _debugIteratorHandler();
    }
}
///////////////////////////// DEBUG CORE END /////////////////////////////

function __maincodeRun() {
    let tarea = document.getElementById("maincode-input");
    tarea.value = _maincodeEditor.getValue();
    let codes = "\"use strict\";\n" + tarea.value;
    __codeCheck(codes);
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

function __logClearRun() {
    let msgbd = document.querySelector("#msg-board");
    msgbd.innerHTML = "";
    msgbd.scrollTop = msgbd.scrollHeight;
}