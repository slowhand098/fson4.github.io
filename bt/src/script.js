"use strict"
let tasks = ["numeral", "ABC", "color"],
	time = { rate: 1500, stimulus: 1000 },
	[dual, sound, reverse] = [1, 1, 1],
	range = { min: 3, max: 99 },
	auto = { min: 1, max: 6, up: 2 },
	board, key, block, input, limit, seq, delay, idle, wl

const audio = new AudioContext(),
	layout = new DocumentFragment(),
	$ = sel => board.querySelector(sel),
	create = (tag, parentNode, className) => {
		const el = document.createElement(tag)
		if (parentNode) parentNode.append(el)
		if (className) el.className = className
		return el
	},
	ocillate = props => {
		if (!sound) return
		if (audio.state === "suspended") audio.resume()
		const p = Object.assign({ wave: "sine", gain: .2, ramp: !0, start: 0 }, props),
			o = new OscillatorNode(audio, { type: p.wave, frequency: p.freq }),
			g = new GainNode(audio, { gain: p.gain })
		g.gain.setValueAtTime(p.gain, audio.currentTime + p.start + .01)
		if (p.ramp) g.gain.exponentialRampToValueAtTime(.0001, audio.currentTime + p.stop)
		o.connect(g).connect(audio.destination)
		o.start(audio.currentTime + p.start)
		o.stop(audio.currentTime + p.stop)
	},
	playPress = () => {
		ocillate({ freq: 540, stop: .1 })
	},
	playAlert = () => {
		let d = .09, [a, b] = [-d, -.05 + d]
		for (let i = 0; i < 7; ++i) ocillate({ freq: 1600, start: a += d, stop: b += d })
	},
	playBuzzer = () => {
		ocillate({ wave: "sawtooth", freq: 140, gain: .18, ramp: !1, stop: .6 })
	},
	clearSeq = () => {
		clearInterval(seq)
		clearTimeout(delay)
		;[seq, delay] = [!1, !1]
		if (speechSynthesis.speaking) speechSynthesis.cancel()
		if (wl) wl.release().then(() => wl = !1)
	},
	prep = () => {
		while (board.firstChild) board.firstChild.remove()
		;[input, limit, idle] = [[], limit > range.max ? range.min : limit, !1]
	},
	ctrl = (tag, className, txt, func, parentNode = layout, active = !1) => {
		for (const [i, c] of className.entries()) {
			const el = create(tag, parentNode, c)
			el.textContent = txt[i]
			el.addEventListener("pointerdown", () => { playPress(); el.classList.add("active"); active = !0
				document.addEventListener("pointerup", () => { el.classList.remove("active"); active = !1 }, { once: !0 }) })
			el.addEventListener("pointerup", () => { if (active) { el.classList.remove("active"); active = !1; func[i](el) }})
		}
	},
	main = () => {
		prep()
		const capFirst = str => str.charAt(0).toUpperCase() + str.slice(1),
			clear = () => {
				[limit, auto.n] = [range.min, 0]
				try { $(".result").remove() } catch { /*0*/ }
				try { help($(".help"), !0) } catch { /*0*/ }
			},
			setA = prssd => {
				if (prssd) { auto.up = auto.up === auto.max ? auto.min : ++auto.up; clear() }
				const x = auto.n
				if (auto.n === auto.up) { ++limit; auto.n = 0 }
				return x > 0 ? x + " of " + auto.up : "X " + auto.up
			},
			speaker = prssd => { if (prssd) sound = !sound; return sound ? "🔊" : "🔇" },
			setT = prssd => {
				if (prssd) { key = tasks.find((k, i, a) => {
					let o = a.indexOf(key) + 1; if (o === a.length) o = 0; return i === o }); clear(); $(".set-a").textContent = setA() }
				return key === "numeral" ? "0-9" : capFirst(key)
			},
			help = (el, cls) => {
				if (!el.firstChild.nodeValue || cls) return (el.textContent = "?")
				el.firstChild.replaceWith(create("ol"))
				for (const txt of ["Start task on the circle", "Note sequence of stimuli", "Recall the order" +
					(reverse ? " backwards" : ""), "Abort task on the red X"]) create("li", el.firstChild).textContent = txt
			},
			fscreen = () => {
				if (document.fullscreenElement) document.exitFullscreen()
				else board.parentNode.requestFullscreen()
			}
		ctrl("p", ["set-a", "set-t", "help"], [setA(), setT(), "?"], [el => el.textContent = setA(!0), el => el.textContent = setT(!0), el => help(el)])
		ctrl("div", ["speaker", "circle"], [speaker(), ""], [el => el.textContent = speaker(!0), task])
		if (document.fullscreenEnabled) ctrl("div", ["screen"], [""], [fscreen])
		board.append(layout)
	},
	result = () => {
		if (reverse) block = block.reverse()
		const ul = create("ul", layout, "result"),
			format = (a, i) => {
				const wrong = a.map((v, i) => v !== block[i]), li = create("li", ul, "match-li-" + i)
				for (const [i, c] of a.entries()) create("span", li, (wrong[i] ? "wrong " : "") + "match " + c + " " + key)
			}
		setTimeout(() => {
			if (block.every((v, i) => v === input[i])) {
				++auto.n
				for (const txt of ["- Well Played -", "Level " + limit, "Memory: " + (limit < 5 ? "Good" : limit < 8 ? "Great" : "Superb")])
					create("li", ul, auto.n < auto.up ? "" : "complete").textContent = txt
				playAlert()
			} else {
				for (const [i, v] of ["- No Match -", block, input].entries()) {
					if (typeof v === "string") create("li", ul).textContent = v
					else format(v, i)
				}
				playBuzzer()
				auto.n = 0
			}
			main()
		}, 150)
	},
	speak = (txt = " ") => {
		const msg = new SpeechSynthesisUtterance(txt)
		;[msg.lang, msg.rate] = [navigator.language, 1.1]
		speechSynthesis.speak(msg)
	},
	build = s => {
		const pat = i => [s[i + 2], s[i + 1], s[i]].slice(limit < 21 ? 1 : limit < 51 ? 0 : 4).join(),
			dupPat = () => s.length !== new Set(s.map((v, i) => pat(i) || i)).size,
			sGen = () => {
				s = []
				const stim = Array.from({ length: range[key] }, (v, i) => "no-" + (key === tasks.at(-1) ? i + 1 : i)),
					numb = str => Number(str.substr(-1))
				let stm = stim[Math.floor(Math.random() * stim.length)]
				while (s.push(stm) < limit)
					while (stm === s.at(-1) || stm === s.at(-2) || numb(stm) === numb(s.at(-1)) + 1 ||
						numb(stm) === numb(s.at(-1)) - 1 || (s.length === limit - 1 && stm === s[0]))
							stm = stim[Math.floor(Math.random() * stim.length)]
			}
		while (!s || dupPat()) sGen()
		return s
	},
	panel = () => {
		const btn = but => {
				if (input.length === limit) return
				if (input.push(but.classList[1]) === limit) result()
			},
			pnl = create("div", layout, "panel " + key), rng = key === tasks.at(-1) ? range[key] : 12
		for (let i = 0, n = 0; i < rng;) {
			if (++i === 10 || i === 12) { create("div", pnl, "box"); continue }
			if (n === 9 && rng === 12) n = -1
			ctrl("div", ["box no-" + (++n) + " " + key], [""], [el => btn(el)], pnl)
		}
		board.append(layout)
	},
	run = (el, stm = block[run.n]) => {
		if (run.n++ === limit) { clearSeq(); el.remove(); return panel() }
		if (idle) return
		requestAnimationFrame(() => {
			el.classList.add(stm, key)
			if (sound && dual && key !== tasks.at(-1)) speak(getComputedStyle(el, "::after").content.toLowerCase())
		})
		el.addEventListener("animationend", () => el.classList.remove(stm, key), { once: !0 })
	},
	task = () => {
		prep()
		const el = create("div", layout, "stimulus")
		ctrl("div", ["esc"], [""], [() => { clearSeq(); [limit, auto.n] = [range.min, 0]; main() }])
		speak()
		block = build()
		board.append(layout)
		if (seq || delay) clearSeq()
		wake()
		delay = setTimeout(() => { run.n = 0; run(el); seq = setInterval(() => run(el), time.rate) }, 1500)
	},
	wake = async () => { try { wl = await navigator.wakeLock.request("screen") } catch { /*0*/ }}
addEventListener("DOMContentLoaded", () => {
	[board, key, limit, auto.n, range.numeral, range.ABC, range.color] = [document.body, tasks[0], range.min, 0, 10, 10, 9]
	main()
	board.style.setProperty("--stm", time.stimulus / 1000 + "s")
	document.addEventListener("visibilitychange", () => idle = document.visibilityState === "hidden" ? !0 : !1)
	document.addEventListener("touchstart", e => e.preventDefault(), { passive: !1 })
	if (location.protocol === "https:") navigator.serviceWorker.register("service-worker.js")
}, { once: !0 })
