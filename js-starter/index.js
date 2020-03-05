function print() {
    let msgbd = document.querySelector("#msg-board");
    let elem = document.createElement("div");
    let numargs = arguments.length;
    let msgstr = "";
    for(let i=0; i<numargs; i++) msgstr += arguments[i].toString() + " ";
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

function maincodeRun() {
    let tarea = document.getElementById("maincode-input");
    tarea.value = maincodeEditor.getValue();
    let codes = tarea.value;
    codeCheck(codes);
    document.querySelector("#last-code-board").innerText = codes;
    console.log(codes);
    try{
        print("[INFO] 开始.");
        eval(codes);
        print("[OK] 运行结束.");
        // let func = new Function(codes);
        // func();
    } catch(e) {
        print("[ERROR] " + e.message);
        console.log(e);
    }
}

function logClearRun() {
    let msgbd = document.querySelector("#msg-board");
    msgbd.innerHTML = "";
    msgbd.scrollTop = msgbd.scrollHeight;
}

var maincodeEditor;
window.onload = () => {
    maincodeEditor = CodeMirror.fromTextArea(document.getElementById("maincode-input"), {
        lineNumbers: true,
        readOnly: false,
        styleActiveLine: true,
        matchBrackets: true
    });
    document.querySelector("#maincode-run-button").disabled = false;
    document.querySelector("#clear-log-button").disabled = false;
    document.querySelector("#loading-text").style.display = "none";
}