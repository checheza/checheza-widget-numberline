import Core from 'checheza_core';
import levels from './levels.json';
import styles from '../assets/numberline.css';
import Hammer from 'hammerjs';
import SwipeAudio from '../assets/sounds/swipe.ogg';
import YouDidIt from '../assets/sounds/levelupYouDidIt.ogg';
import GoodSound from '../assets/sounds/good.ogg';
import BadSound from '../assets/sounds/bad.ogg';

class MainDomain {
	constructor() {
		this.levels = levels;
	}

	start() {
		Core.utils.adjustAspectRatio();
        Core.utils.addSky('partly-cloudy');
        Core.utils.setSkyColor("#4488ff");
        Core.utils.addExitButton();
		this.levelHandler = new NumberlineLevelHandler(this.levels);
	}

	render() {
        return `<div class=" ${styles.h50} ${styles.w100} ${styles.relative}" id="green_hills">
                <div class="${styles.level_indicator_container}" id="level_indicator_container">
                    <div class="${styles.level_indicator}" id="level_indicator">

                    </div>
                    <div class="${styles.level_indicator_bg}" id="level_indicator_bg">

                    </div>
                </div>
                <div class="${styles.current_problem}" id="current_problem">

                </div>
            </div>
            <div class=" ${styles.h50} ${styles.w100} ${styles.relative} ${styles.grass} ${styles.hill}" id="green_hills">
                <div class="${styles.numberline}" id="numberline">
                    <canvas class="${styles.numberlineCanvas}" id="numberlineCanvas">

                    </canvas>
                </div>
                <div class="${styles.slider}" id="slider">

                </div>
                <div class="${styles.blockholder}" id="blockholder">

                </div>
                <div class="${styles.helpers}" id="helpers">

                </div>
            </div>`;
	}
}

class NumberlineLevelHandler {
	constructor(levelData) {
		this.level_indicator = document.getElementById('level_indicator');

		// Extract relevant information
		this.levels = levelData.map((level) => {
			return new NumberlineLevel(level, this);
		});

		this.currentLevel = this.getSavedProgress();
		this.changeLevel(this.currentLevel);
	}

	getSavedProgress() {
		var storage = window.localStorage;
		var progress =
			storage.getItem('numberline_progress') === null
				? 0
				: storage.getItem('numberline_progress');

		return parseInt(
			progress > this.levels.length ? this.levels.length : progress
		);
	}

	saveProgress() {
		var storage = window.localStorage;
		if (storage.getItem('numberline_progress') === null) {
			storage.setItem('numberline_progress', 0);
		} else {
			storage.setItem('numberline_progress', this.currentLevel);
		}
	}

	nextLevel() {
		this.currentLevel = this.currentLevel + (1 % this.levels.length);
		this.changeLevel(this.currentLevel);
	}

	prevLevel() {
		this.currentLevel = this.currentLevel - (1 % this.levels.length);
		this.changeLevel(this.currentLevel);
	}

	changeLevel(index) {
		this.saveProgress();
		this.levels[index].startLevel();
		this.setLevelIndicator(index);
	}

	setLevelIndicator(index) {
		this.level_indicator.innerHTML = '<h1>' + index + '</h1>';
	}
}

class NumberlineSlider {
	constructor(level) {
		this.level = level;
		this.range = level.getRange();
		this.labelInterval = level.labelInterval;
		this.numberlineCanvas = document.getElementById('numberlineCanvas');

		this.slider = document.getElementById('slider');
		this.block_holder = document.getElementById('blockholder');

		numberlineCanvas.width = numberlineCanvas.clientWidth;
		numberlineCanvas.height = numberlineCanvas.clientHeight;

		this.fontSize = numberlineCanvas.width * (35 / 1420);

		this.context = numberlineCanvas.getContext('2d');
		this.color = '#4B2C2C';
		this.height = this.numberlineCanvas.height;
		this.width = this.numberlineCanvas.width;
	}

	initializeSlider() {
		this.slider_pad = document.createElement('div');
        this.slider_pad.setAttribute('id', 'pad');
        this.slider_pad.classList.add(styles.pad);
		this.slider.appendChild(this.slider_pad);

		this.slider_pad_selector = document.createElement('div');
        this.slider_pad_selector.setAttribute('id', 'pad_selector');
        this.slider_pad_selector.classList.add(styles.pad_selector);

		document
			.getElementById('core_app_container')
			.appendChild(this.slider_pad_selector);

		// Initialize touch event object on slider
		this.sliderTouchEvent = new Hammer.Manager(this.slider_pad_selector);

		this.sliderTouchEvent.add(
			new Hammer.Press({
				event: 'press',
				time: 100,
				threshold: 1000,
				pointer: 1,
			})
		);
		this.sliderTouchEvent.add(new Hammer.Tap());
		this.sliderTouchEvent.add(new Hammer.Pan({ event: 'pan' }));
		this.sliderTouchEvent.add(new Hammer.Pan({ event: 'panend' }));

		// Handle touch events on slider
		this.sliderTouchEvent.on('press', (e) => {
			e.preventDefault();
			this.enterPad();
		});
		this.sliderTouchEvent.on('pressup', (e) => {
			this.releasePad();
		});
		this.sliderTouchEvent.on('tap', (e) => {
			this.tapPad();
		});
		this.sliderTouchEvent.on('pan', (e) => {
			this.enterPad();
			this.handlePanEvent(e);
		});
		this.sliderTouchEvent.on('panend', (e) => {
			this.releasePad(e);
		});

        setTimeout(() => {
            this.setBlocks(0);
        }, 100);
	}

	deinitializeSlider() {
		delete this.sliderTouchevent;
		this.slider.removeChild(this.slider_pad);
		document
			.getElementById('core_app_container')
			.removeChild(this.slider_pad_selector);
	}

	tapPad() {
		this.animPadDown();
		setTimeout(() => {
			this.releasePad();
		}, 200);
	}
	enterPad() {
		this.animPadDown();
	}

	releasePad() {
		this.submitAnswer();
	}
	// This method is called when user releases the finger from the slider
	submitAnswer(event) {
		this.level.submitAnswer(this.numberOfBlocks);
		this.animPadUp();
	}

	animPadUp() {
		this.slider_pad.classList.remove(styles.push);
	}

	animPadDown() {
		this.slider_pad.classList.add(styles.push);
	}

	handlePanEvent(event) {
		// Get the width of a block
		let blockWidth =
			(this.block_holder.clientWidth -
				0.005 * this.block_holder.clientWidth) /
			this.range.total;
		let rect = document
			.getElementById('core_app_container')
			.getBoundingClientRect();
		// Get the position of the slider on screen
		let numberlinePositionX =
			parseFloat(rect.left) +
			parseFloat(window.getComputedStyle(this.block_holder).left);
		// Calculate the number of blocks that is to be placed on the slider
		let n = parseInt((event.center.x - numberlinePositionX) / blockWidth);
		if (n < 0) n = 0;

		// If the number of blocks have not changed, do not setBlocks (re-render with n blocks)
		if (n !== this.numberOfBlocks) {
			this.setBlocks(n);
		}
	}

	setBlocks(numberOfBlocks) {
		if (numberOfBlocks) {
			Core.audio.play(SwipeAudio);
		}
		// restrict numberOfBlocks to current range
		this.numberOfBlocks =
			numberOfBlocks < this.range.total
				? numberOfBlocks
				: this.range.total;

		// Calculate pad position
		let padPositionX =
			0.076 * this.width +
			(((this.width - 0.1 * this.width) / this.range.total) *
				this.numberOfBlocks +
				1);
		let blockWidth =
			(this.block_holder.clientWidth -
				0.005 * this.block_holder.clientWidth) /
			this.range.total;
		this.block_holder.innerHTML = '';

		for (let i = 0; i < this.numberOfBlocks; i++) {
			this.block_holder.innerHTML +=
				`<div class="${styles.block}" style="width:${blockWidth}px"><div class="${styles.img}"></div></div>`;
		}

		// set red pad position
		this.slider_pad.style.marginLeft = padPositionX + 'px';
		this.padSelectorAtPad();
	}

	padSelectorAtPad() {
		if (document.getElementById('pad')) {
			let slider_pad_rect = document
				.getElementById('pad')
				.getBoundingClientRect();
			document.getElementById('pad_selector').style.left =
				slider_pad_rect.left + 'px';
			document.getElementById('pad_selector').style.top =
				slider_pad_rect.top + 'px';
			document.getElementById(
				'pad_selector'
			).style.width = window.getComputedStyle(
				document.getElementById('pad')
			).width;
			document.getElementById(
				'pad_selector'
			).style.height = window.getComputedStyle(
				document.getElementById('pad')
			).height;
		}
	}

	createNumberline() {
		this.context.beginPath();
		this.context.lineWidth = this.height * 0.05;
		this.context.lineCap = 'round';
		this.context.strokeStyle = this.color;
		this.context.moveTo(15, this.height - 0.52 * this.height);
		this.context.lineTo(this.width - 15, this.height - 0.52 * this.height);
		this.context.stroke();
		this.context.closePath();

		this.createSeparators();
	}

	createSeparators() {
		let label = this.range.start;

		for (let i = 0; i < this.range.total + 1; i++) {
			let xPosition =
				this.width * 0.05 + ((this.width * 0.9) / this.range.total) * i;
			let lineHeight = this.height * 0.5;

			let lineWidth = (this.width * 0.08) / this.range.total;

			this.context.beginPath();
			this.context.strokeStyle = this.color;
			this.context.lineCap = 'round';

			if (i % 5 === 0) {
				lineHeight = this.height * 0.3;
			}

			if (i % 10 === 0) {
				lineHeight = this.height * 0.3;
				lineWidth = (this.width * 0.1) / this.range.total;
			}

			this.context.moveTo(xPosition, this.height * 0.65);
			this.context.lineWidth = lineWidth;
			this.context.lineTo(xPosition, lineHeight);
			this.context.stroke();
			this.context.closePath();

			if (i % this.labelInterval == 0) {
				this.placeLabelAt(xPosition, label);
			}

			label++;
		}
	}

	placeLabelAt(pos, label) {
		this.context.textBaseline = 'center';
		this.context.textAlign = 'center';
		this.context.font = this.fontSize + 'px AldiBold';
		this.context.fillText(label, pos, this.height - 0.03 * this.height);
	}
}

class NumberlineLevel {
	constructor(level, levelhandler) {
		this.current_problem = document.getElementById('current_problem');
		this.level_indicator = document.getElementById('level_indicator');
		this.helpers_area = document.getElementById('helpers');
		this.leveldata = level;
		this.levelhandler = levelhandler;
		this.problem_data = level[2];
		this.problemType = level[0];
		this.level = level[1];
		this.range = this.parseRange(level[6]);
		this.problem = this.parseProblem(level[2]);
		this.labelInterval = level[7];
		this.stepSize;
		this.displayType;
		this.bracketHelper;
		this.help = this.parseHelp(level[9]);
		this.notRequiredForAge12;
		this.requiredForSkill;
		this.denominatorNumberline;
		this.comment;
		this.rowNum;
		this.lives = 3;
		this.replays = 0;
		this.submittedAnswers = [];
	}

	parseHelp(helpData) {
		return {
			showArrow: helpData.indexOf('arrow') != -1,
			showHand: helpData.indexOf('cursor') != -1,
		};
	}

	showHelpingHandTo(index) {
		let hand = document.createElement('div');
        hand.setAttribute('id', 'cursor');
        hand.classList.add(styles.cursor);
		this.helpers_area.appendChild(hand);

		let to = ((this.slider.width * 0.9) / this.slider.range.total) * index;

		setTimeout(() => {
			hand.style.transform = 'translate(' + to + 'px)';
			setTimeout(() => {
				hand.style.opacity = 0;
				setTimeout(() => {
					hand.remove();
				}, 1000);
			}, 1000);
		}, 1000);
	}

	showHelpingArrowTo(from, to) {
		this.clearArrow();

		let arrow = document.createElement('div');
        arrow.setAttribute('id', 'arrow');
        arrow.classList.add(styles.arrow);
		this.helpers_area.appendChild(arrow);
		let forward = true;
		let left = 0;
		let width = 0;

		if (this.submittedAnswers.length > 0) {
			if (
				this.problem.operators[this.submittedAnswers.length - 1] === '-'
			) {
				forward = false;
			}
		}

		if (forward) {
			left = ((this.slider.width * 0.9) / this.slider.range.total) * from;
			width = ((this.slider.width * 0.9) / this.slider.range.total) * to;
		} else {
			left =
				((this.slider.width * 0.9) / this.slider.range.total) *
				(from - to + 1);
			width = ((this.slider.width * 0.9) / this.slider.range.total) * to;
			arrow.style.transform = 'scale(-1)';
			arrow.style.marginLeft = '1.7%';
		}

		arrow.style.left = left + 'px';
		arrow.style.width = width + 'px';
	}

	displayProblem() {
		this.current_problem.innerHTML = '';

		for (let i = 0; i < this.problem.operands.length; i++) {
			if (i == 0) {
				this.current_problem.innerHTML +=
					`<h1 class="operand ${styles.active}">${this.problem.operands[i]}</h1>`;
			} else {
				this.current_problem.innerHTML +=
					`<h1 class="operand">${this.problem.operands[i]}</h1>`;
			}
			if (this.problem.operators.length > 1)
				this.current_problem.innerHTML +=
					`<h1 class="operator">${this.problem.operators[i]}</h1>`;

		}

		if (this.problem.operators.length > 1) {
			this.current_problem.innerHTML += `<h1 class="answer">?</h1>`;
		}
	}

	nextProblem() {
		this.endLevel();
		this.submittedAnswers = [];

		this.replays++;
		let baseScale = 1 + parseFloat(this.replays / 7) * 2;
		document.getElementById('level_indicator_bg').style.transform =
			'scale(' + baseScale + ',' + baseScale + ')';

		if (this.replays < 7) {
			this.problem = this.parseProblem(this.problem_data);
			this.startLevel();
		} else {
			Core.audio.play(YouDidIt);
			document.getElementById('level_indicator_bg').style.transform =
				'scale(' + 30 + ',' + 30 + ')';
			setTimeout(() => {
				this.levelhandler.nextLevel();
				document.getElementById('level_indicator_bg').style.transform =
					'scale(' + 1 + ',' + 1 + ')';
			}, 2000);
		}
	}

	submitAnswer(answer) {
		if (
			this.submittedAnswers.length === 0 &&
			parseInt(this.problem.result) === parseInt(answer)
		) {
			let displayOperands = document.getElementsByClassName('operand');
			displayOperands[this.submittedAnswers.length].classList.remove(
				styles.active
			);

			if (this.problem.operands.length > 1) {
				document.getElementsByClassName('answer')[0].remove();
				this.current_problem.innerHTML +=
					`<h1 class="${styles.result} ${styles.bg}"> ${this.problem.result} </h1>`;
			} else {
				document.getElementsByClassName('operand')[0].remove();
				this.current_problem.innerHTML +=
                    `<h1 class="${styles.result} ${styles.bg}"> ${this.problem.result} </h1>`;
			}

			Core.audio.play(GoodSound);

			setTimeout(() => {
				this.nextProblem();
				this.lives = 3;
				this.slider.setBlocks(0);
			}, 2000);
			return;
		}

		if (
			parseInt(this.problem.answerChain[this.submittedAnswers.length]) ===
			parseInt(answer)
		) {
			let displayOperands = document.getElementsByClassName('operand');
			displayOperands[this.submittedAnswers.length].classList.remove(
				styles.active
			);

			if (
				this.submittedAnswers.length ===
				this.problem.answerChain.length - 1
			) {
				if (this.problem.operands.length > 1) {
					document.getElementsByClassName('answer')[0].remove();
					this.current_problem.innerHTML +=
                        `<h1 class="${styles.result} ${styles.bg}"> ${this.problem.result} </h1>`;
				} else {
					document.getElementsByClassName('operand')[0].remove();
					this.current_problem.innerHTML +=
                        `<h1 class="${styles.result} ${styles.bg}"> ${this.problem.result} </h1>`;
                }
                
				Core.audio.play(GoodSound);

				setTimeout(() => {
					this.lives = 3;
					this.nextProblem();
				}, 2000);
				return;
			} else {
				displayOperands[this.submittedAnswers.length].classList.remove(
					styles.active
				);
				this.submittedAnswers.push(answer);
				if (this.help.showArrow)
					this.showHelpingArrowTo(
						answer,
						this.problem.operands[this.submittedAnswers.length]
					);

				this.slider.setBlocks(answer);
				if (
					this.submittedAnswers.length <
					this.problem.answerChain.length
				)
					displayOperands[this.submittedAnswers.length].classList.add(
						styles.active
					);
			}
		} else {
			this.endLevel();
			this.submittedAnswers = [];
			this.slider.setBlocks(0);

			this.lives--;
			Core.audio.play(BadSound);

			document.getElementById('core_container').style.animation =
				'shake 0.5s';
			setTimeout(() => {
				document.getElementById('core_container').style.animation = '';
			}, 500);
			if (this.lives < 1) {
				this.submittedAnswers = [];
				this.lives = 3;
				this.replays = 0;
				let baseScale = 1 + parseFloat(this.replays / 7) * 2;
				document.getElementById('level_indicator_bg').style.transform =
					'scale(' + baseScale + ',' + baseScale + ')';
				this.problem = this.parseProblem(this.problem_data);

				this.startLevel();
			} else {
				this.startLevel();
			}
		}
	}

	parseProblem(problem) {
		let operators = [];
		let operands = [];
		let answerChain = [];

		problem.match(/[\(\+|\-|\)|]*\([^)]*\)[\+|\-|=]+/g).forEach((group) => {
			let operator = group.split(')')[1];
			var operand = group.split(')')[0].replace('(', '');

			if (operator !== '=' && operator.length > 1) {
				operator =
					operator[
						NumberlineLevel.randomRange(0, operator.length) - 1
					];
			}

			let randomMax = parseInt(operand.split('-')[1]);
			let randomMin = parseInt(operand.split('-')[0]);

			operand = Math.floor(
				Math.random() *
					(Math.floor(randomMax) - Math.floor(randomMin)) +
					Math.floor(randomMin)
			);
			operand = operand % parseInt(this.range.end);
			if (!isNaN(operand)) {
				operators.push(operator);
				operands.push(operand);
			} else {
				let val = group.split(')')[0].replace('(', '');
				val = val[Math.floor(Math.random() * Math.floor(1))];
				operand = group.split(')')[1].replace('(', '');

				operator = group.split(')')[2].replace('(', '');

				if (operator !== '=' && operator.length > 1) {
					operator =
						operator[
							NumberlineLevel.randomRange(0, operator.length) - 1
						];
				}

				randomMax = parseInt(operand.split('-')[1]);
				randomMin = parseInt(operand.split('-')[0]);

				operand = Math.floor(
					Math.random() *
						(Math.floor(randomMax) - Math.floor(randomMin)) +
						Math.floor(randomMin)
				);

				if (val === '-') {
					operand = operand * -1;
				}

				operators.push(operator);
				operands.push(operand);
			}
		});

		let result = operands[0];
		answerChain.push(result);

		for (let i = 0; i < operands.length; i++) {
			let operator = operators[i];
			switch (operator) {
				case '-':
					if (result - operands[i + 1] < this.range.start) {
						operands[i + 1] = operands[i + 1] % Math.abs(result);
					}
					result -= operands[i + 1];
					break;
				case '+':
					if (result + operands[i + 1] > this.range.end) {
						operands[i + 1] =
							operands[i + 1] % (this.range.end - result);
					}
					result += operands[i + 1];
					break;
			}
			answerChain.push(result);
		}

		answerChain.pop();

		return {
			operators: operators,
			operands: operands,
			answerChain: answerChain,
			result: result,
		};
	}

	// Improve this
	parseRange(range) {
		let rangeSplitted = range.split('-');
		let start, end, total;

		if (range.charAt(0) === '-') {
			start = parseInt(rangeSplitted[1]);
			end = parseInt(rangeSplitted[2]);
			total = Math.abs(
				parseInt(rangeSplitted[1]) + parseInt(rangeSplitted[2])
			);
		} else {
			start = parseInt(rangeSplitted[0]);
			end = parseInt(rangeSplitted[1]);
			total = Math.abs(
				parseInt(rangeSplitted[0]) + parseInt(rangeSplitted[1])
			);
		}

		return {
			start: start,
			end: end,
			total: total,
		};
	}

	getRange() {
		return this.range;
	}

	endLevel() {
		this.slider.deinitializeSlider();
	}

	clearArrow() {
		let arrow = document.getElementById('arrow');
		if (arrow) arrow.remove();
	}

	startLevel() {
		this.clearArrow();
		this.slider = new NumberlineSlider(this);
		this.slider.createNumberline();
		this.slider.initializeSlider();

		if (this.help.showArrow)
			this.showHelpingArrowTo(this.range.start, this.problem.operands[0]);

		if (this.help.showHand && this.replays == 0)
			this.showHelpingHandTo(this.problem.operands[0]);

		this.displayProblem();
	}

	// return a random integer between x and y
	static randomRange(x, y) {
		return Math.abs(
			Math.floor(Math.random() * (Math.ceil(x) - Math.floor(y))) +
				Math.ceil(x)
		);
	}
}

export default MainDomain;
