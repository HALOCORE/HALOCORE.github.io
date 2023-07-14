import AudioMotionAnalyzer from './libs/audiomotion/audioMotion-analyzer.js';

// create a fredboard for ukulele at #fretboard using svg.js
let notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
let numbered_rel_idx = [0, 2, 4, 5, 7, 9, 11];
let note_to_number_dict_by_scale = {};
let note_to_frequency_dict = {};
// assume A4 = 440 Hz
for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 12; j++) {
        if (i === 0 && j <= 8) continue;
        let note = notes[j] + i;
        let frequency = 440 * 2 ** (((i - 4) * 12 + (j - 9)) / 12);
        note_to_frequency_dict[note] = frequency;
    }
}
console.log("note_to_frequency_dict = ", note_to_frequency_dict);
let note_to_bags_of_bar_idxes = {};
let note_strength_dict = {};
for (let note in note_to_frequency_dict) {
    note_strength_dict[note] = 0;
}
console.log("note_strength_dict:", note_strength_dict);
function update_notes_strength(bars) {
    for (let note in note_strength_dict) {
        if (note_to_bags_of_bar_idxes[note] === undefined) {
            note_to_bags_of_bar_idxes[note] = [];
            // find the nearest frequency
            let min_diff = 100000;
            let min_diff_idx = -1;
            for (let i = 0; i < bars.length; i++) {
                let diff = Math.abs(bars[i].freq - note_to_frequency_dict[note]);
                if (diff < min_diff) {
                    min_diff = diff;
                    min_diff_idx = i;
                }
            }
            note_to_bags_of_bar_idxes[note].push(min_diff_idx);
            if (bars[min_diff_idx].freq < note_to_frequency_dict[note]) {
                // the next bar is closer
                note_to_bags_of_bar_idxes[note].push(min_diff_idx + 1);
            } else {
                // the previous bar is closer
                note_to_bags_of_bar_idxes[note].push(min_diff_idx - 1);
            }
        }
        let bag_of_bar_idxes = note_to_bags_of_bar_idxes[note];
        let sum_var = 0;
        for (let bar_idx of bag_of_bar_idxes) {
            sum_var += bars[bar_idx].value[0];
            if (bars[bar_idx].value.length > 1) throw Error("bars[bar_idx].value.length > 1");
        }
        // console.log(sum_var);
        note_strength_dict[note] = sum_var / bag_of_bar_idxes.length;
    }
}

let note_to_ukulele_circles_dict = {};
let note_to_keyboard_bar_dict = {};
let note_to_last_visualize_value = {};
function visualize_notes_strength() {
    for (let note in note_to_keyboard_bar_dict) {
        let circles = note_to_ukulele_circles_dict[note];
        let bar = note_to_keyboard_bar_dict[note];
        let strength = note_strength_dict[note];
        if (note_to_last_visualize_value[note] !== strength) {
            if(circles) for (let circle of circles) circle.attr({ 'r': 30 * (0.5 + 0.8 * (strength)) });
            // change color (red) of the bar
            if (note.includes('#')) {
                // strength = 0 -> black
                // strength = 1 -> red
                let red =  Math.floor(255 * (strength));;
                let green = 0;
                let blue = 0;
                bar.attr({ 'fill': `rgb(${red}, ${green}, ${blue})` });

            } else {
                // strength = 0 -> white
                // strength = 1 -> red
                let red = 255;
                let green = Math.floor(255 * (1 - strength));
                let blue = Math.floor(255 * (1 - strength));
                bar.attr({ 'fill': `rgb(${red}, ${green}, ${blue})` });
            }
        }
        note_to_last_visualize_value[note] = strength;
    }
}


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

function choose_note(note) {
    document.getElementById("chosen-note").innerText = note + "  freq = " + note_to_frequency_dict[note].toFixed(5) + " Hz";
}

let white_key_notes = notes.filter(x => !x.includes('#'));
let white_key_looped = [];
let black_key_notes = notes.filter(x => x.includes('#'));
let black_key_looped = [];
for (let i = 0; i < 9; i++) {
    white_key_looped = white_key_looped.concat(white_key_notes.map(x => x + String(i)));
    black_key_looped = black_key_looped.concat(black_key_notes.map(x => x + String(i)));
}
function get_white_key_note(white_key_idx) {
    // TODO
    return white_key_looped[white_key_idx + 5];
}

function get_black_key_note(black_key_idx) {
    // TODO
    return black_key_looped[black_key_idx + 4];
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
            let note = get_text_of_pos(i, j, false);
            if (note_to_ukulele_circles_dict[note] === undefined) note_to_ukulele_circles_dict[note] = [];
            note_to_ukulele_circles_dict[note].push(svg_elem_dict[elem_id]);
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
            // add onhover event
            svg_elem_dict[elem_id].mouseenter(function () {
                this.fill({ color: '#00aa00ff' });
                choose_note(note);
            });
            svg_elem_dict[elem_id].mouseout(function () {
                this.fill({ color: '#000000aa' });
            });
        }
    }

    // create a keyboard with width 100%
    let keyboard = SVG().addTo('#keyboard').size('100%', 150);

    // draw a 88-key keyboard, black-key and white-key height ratio is 9:15
    // there are 36 black keys and 52 white keys
    let white_key_width = 100 / 52;
    let black_key_width = white_key_width * 9 / 15;
    let black_key_height = 100 * 9 / 15;
    let white_key_height = 100;
    // above values are in percentage
    // draw white keys
    for (let i = 0; i < 52; i++) {
        let x = i * white_key_width + '%';
        let y = 0;
        let elem_id = 'white_key_' + i;
        svg_elem_dict[elem_id] = keyboard.rect(white_key_width + '%', white_key_height + '%').attr({
            id: elem_id,
            fill: '#ffffff', x: x, y: y,
            stroke: '#00000099',
            'stroke-width': 2
        });
        let note = get_white_key_note(i);
        note_to_keyboard_bar_dict[note] = svg_elem_dict[elem_id];
        // add onhover event
        svg_elem_dict[elem_id].mouseenter(function () {
            this.fill({ color: '#00aa00ff' });
            choose_note(note);
        });
        svg_elem_dict[elem_id].mouseout(function () {
            this.fill({ color: '#ffffff' });
        });
    }
    // draw black keys
    function black_key_idx_to_beside_white_key_idx(black_key_idx) {
        // this function converts black key index to the index of the white key beside it
        // first, mod 5 to get the number of group and times 7, then add the offset
        let group_idx = Math.floor(black_key_idx / 5);
        let remainder = black_key_idx % 5;
        let offset = 0;
        if (remainder === 0) offset = 0;
        else if (remainder === 1) offset = 2;
        else if (remainder === 2) offset = 3;
        else if (remainder === 3) offset = 5;
        else if (remainder === 4) offset = 6;
        return group_idx * 7 + offset;
    }

    for (let i = 0; i < 36; i++) {
        // let x = (i + 1) * white_key_width - black_key_width / 2 + '%';
        // the above x does not consider that black keys are not evenly distributed
        let beside_white_key_idx = black_key_idx_to_beside_white_key_idx(i);
        let x = beside_white_key_idx * white_key_width + white_key_width - black_key_width / 2 + '%';
        let y = 0;
        let elem_id = 'black_key_' + i;
        svg_elem_dict[elem_id] = keyboard.rect(black_key_width + '%', black_key_height + '%').attr({
            id: elem_id,
            fill: '#000000', x: x, y: y,
            stroke: '#00000099',
            'stroke-width': 2
        });
        let note = get_black_key_note(i);
        note_to_keyboard_bar_dict[note] = svg_elem_dict[elem_id];
        // add onhover event
        svg_elem_dict[elem_id].mouseenter(function () {
            this.fill({ color: '#00aa00ff' });
            choose_note(note);
        });
        svg_elem_dict[elem_id].mouseout(function () {
            this.fill({ color: '#000000' });
        });
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
                    update_notes_strength(bars);
                    visualize_notes_strength();
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