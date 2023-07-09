import AudioMotionAnalyzer from './libs/audiomotion/audioMotion-analyzer.js';

// create a fredboard for ukulele at #fretboard using svg.js
let notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
let numbered_rel_idx = [0, 2, 4, 5, 7, 9, 11];
let note_to_number_dict_by_scale = {};

function get_note_of_pos(string_idx, fret_idx) {
    // string_idx: 0, 1, 2, 3 are A, E, C, G
    // fret_idx increases from 0 to 17 (C, C#, D, ...)
    let string_base = ["A", "E", "C", "G"].map(x => notes.indexOf(x));
    let idx = (string_base[string_idx] + fret_idx) % 12;
    let suffix = Math.floor((string_base[string_idx] + fret_idx) / 12) + 4;
    return notes[idx] + suffix;
}

function get_text_of_pos(string_idx, fret_idx, is_numbered = false, scale = 'F4') {
    let note = get_note_of_pos(string_idx, fret_idx);
    if (is_numbered) {
        if (note_to_number_dict_by_scale[scale] === undefined) {
            // compute the numbered note according to scale (the scale specifies number 1)
            // use 1+ to indicate the octave, 1++ to indicate the next octave
            let scale_base = scale.slice(0, -1);
            let scale_octave = parseInt(scale.slice(-1));
            let scale_idx = notes.indexOf(scale_base);
            let note_to_number_dict = {};
            for (let rel_octave = -2; rel_octave < 6; rel_octave++) {
                for (let i = 0; i < 7; i++) {
                    let real_i = numbered_rel_idx[i];
                    let abs_octave = scale_octave + rel_octave;
                    let abs_note_base = notes[(scale_idx + real_i) % 12];
                    let abs_octave_offseted = abs_octave + Math.floor((scale_idx + real_i) / 12);
                    let note = abs_note_base + abs_octave_offseted;
                    let numbered_note = String(i + 1);
                    if (rel_octave > 0) numbered_note += "^".repeat(rel_octave);
                    if (rel_octave < 0) numbered_note += "_".repeat(-rel_octave);
                    note_to_number_dict[note] = numbered_note;
                }
            }
            note_to_number_dict_by_scale[scale] = note_to_number_dict;
        }
        return note_to_number_dict_by_scale[scale][note] ?? "";
    } else {
        return note;
    }
}

let svg_elem_dict = {};

function analyze_bars(bars) {
    // console.log("bars.length = ", bars.length);
    // bars[0] = {"posX":-58,"freq":16.14990234375,"freqLo":16.14990234375,"freqHi":16.14990234375,"hold":[30],"peak":[0,0],"value":[0]}
    // console.log("bars[60] = ", bars[60]); // for debugging
    // find the bar with the highest value
    let max_value = 0;
    let max_value_idx = 0;
    for (let i = 0; i < bars.length; i++) {
        if (bars[i].value[0] > max_value) {
            max_value = bars[i].value[0];
            max_value_idx = i;
        }
    }
    let msg = "max_freq = " + bars[max_value_idx].freq.toFixed(2) + " Hz,  val = " + max_value;
    document.getElementById("summary").innerText = msg;
}

function main() {
    // create a fretboard with width 100%
    let draw = SVG().addTo('#fretboard').size('100%', 200);

    let ratio = 1.0594630943592953; // 12th root of 2
    console.log("ratio = ", ratio);
    console.log("ratio**12 = ", ratio ** 12);
    console.log("ratio**18 = ", ratio ** 18);
    let full_range = 96;
    let base = full_range / (ratio ** 18 - 1);
    console.log("base = ", base);

    // compute the position of vertical lines. The first line at 2% and the last line at 98%
    // 18 lines in total. The first line corresponds to ratio**17 and the last line corresponds to ratio**0
    let positions = [];
    for (let i = 0; i < 19; i++) {
        positions.push(2 + 96 - base * (ratio ** (18 - i) - 1));
    }
    console.log("positions = ", positions);


    // draw for horizontal lines
    for (let i = 0; i < 4; i++) {
        draw.line('2%', 50 * i + 25, '98%', 50 * i + 25).stroke({ color: '#00000099', width: 2 });
    }
    //draw vertical lines
    for (let i = 0; i < 19; i++) {
        draw.line(positions[i] + '%', 25 - 15, positions[i] + '%', 200 - 25 + 15).stroke({ color: '#00000099', width: 4 });
    }
    // draw a circle near every cross of horizontal and vertical lines
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 19; j++) {
            let x = (positions[j]) - 1.1 + "%";
            let y = 50 * i + 25;
            console.log("x = ", x, "y = ", y);
            let elem_id = 'circle_' + i + '_' + j;
            svg_elem_dict[elem_id] = draw.circle(30).attr({
                id: elem_id,
                fill: '#00407044', cx: x, cy: y
            });
        }
    }
    // draw the note dots on the fretboard (one at 5th fret, 7th fret, 10th fret, 14 fret, two at 12th fret)
    let dot_positions = [5, 7, 10, 12, 14];
    for (let i = 0; i < dot_positions.length; i++) {
        let x = (positions[dot_positions[i]] + positions[dot_positions[i] - 1]) / 2 + "%";
        if (dot_positions[i] !== 12) {
            let y = 50 * 2 + 25 - 25;
            console.log("dot x = ", x, "y = ", y);
            let elem_id = 'dot_' + i;
            svg_elem_dict[elem_id] = draw.circle(20).attr({
                id: elem_id,
                fill: '#40402044', cx: x, cy: y
            });
        } else {
            for (let j of [1, 3]) {
                let y = 50 * j + 25 - 25;
                console.log("dot x = ", x, "y = ", y);
                let elem_id = 'dot_' + i + '_' + j;
                svg_elem_dict[elem_id] = draw.circle(20).attr({
                    id: elem_id,
                    fill: '#40402044', cx: x, cy: y
                });
            }
        }
    }
    // add text to the circles
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 19; j++) {
            let x = (positions[j]) - 1.6 + "%";
            let y = 50 * i + 30;
            let note = get_text_of_pos(i, j, false);
            console.log("text x = ", x, "y = ", y, "note = ", note);
            let elem_id = 'text_' + i + '_' + j;
            svg_elem_dict[elem_id] = draw.text(note).attr({
                id: elem_id,
                fill: '#000000aa', x: x, y: y
            });
        }
    }

    // draw the audio analyzer
    const audioMotion = new AudioMotionAnalyzer(
        document.getElementById('audio-analyzer'),
        {
            gradient: 'rainbow',
            showScaleY: true,
            connectSpeakers: true,
            height: 200
        }
    );

    if (navigator.mediaDevices) {
        navigator.mediaDevices.getUserMedia({ audio: true, video: false })
            .then(stream => {
                // create stream using audioMotion audio context
                const micStream = audioMotion.audioCtx.createMediaStreamSource(stream);
                // connect microphone stream to analyzer
                audioMotion.connectInput(micStream);
                // mute output to prevent feedback loops from the speakers
                audioMotion.volume = 0;
                // set a timer to get bars every 50ms
                setInterval(() => {
                    let bars = audioMotion.getBars();
                    analyze_bars(bars);
                }, 50);

            })
            .catch(err => {
                alert('Microphone access denied by user');
            });
    }
    else {
        alert('User mediaDevices not available');
    }
}

function change_scale() {
    // change the text of the circles
    let scale_select = document.getElementById("scale-select");
    let scale = scale_select.options[scale_select.selectedIndex].value;
    console.log("scale = ", scale);
    if (scale == "None") {
        // change to normal note
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 19; j++) {
                let note = get_text_of_pos(i, j, false);
                svg_elem_dict['text_' + i + '_' + j].text(note);
            }
        }
    } else {
        // change to numbered note
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 19; j++) {
                let note = get_text_of_pos(i, j, true, scale);
                svg_elem_dict['text_' + i + '_' + j].text(note);
            }
        }
    }
}


window.change_scale = change_scale;

main();