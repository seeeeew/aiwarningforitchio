// ==UserScript==
// @name         AI warning for itch.io
// @namespace    https://github.com/seeeeew/aiwarningforitchio
// @version      0.1.0
// @description  Shows a warning popup on itch.io pages of products containing AI generated content.
// @author       seeeeew
// @homepage     https://github.com/seeeeew/aiwarningforitchio
// @match        https://*.itch.io/*
// @icon         https://raw.githubusercontent.com/seeeeew/aiwarningforitchio/refs/heads/main/img/icon128.png
// @grant        none
// @run-at       document-end
// @updateURL    https://github.com/seeeeew/aiwarningforitchio/raw/refs/heads/main/aiwarningforitchio.user.js
// @downloadURL  https://github.com/seeeeew/aiwarningforitchio/raw/refs/heads/main/aiwarningforitchio.user.js
// @supportURL   https://github.com/seeeeew/aiwarningforitchio/issues
// @license      MIT
// ==/UserScript==

(async function() {

	const aitags = [
		"ai-generated",
		"ai-generated-graphics",
		"ai-generated-audio",
		"ai-generated-text",
		"ai-generated-code"
	];

	if (document.body.dataset.page_name !== "view_game") return;

	async function fetchData() {
		const dataurl = window.location.origin + window.location.pathname + "/data.json";
		const response = await fetch(dataurl);
		if (response?.status !== 200) return;
		const data = await response.json();
		const tags = data?.tags;
		const title = data?.title;
		return {title, tags};
	}

	function checkAITags(tags) {
		let hasai = false;
		const aitypes = [
			"graphics",
			"audio",
			"text",
			"code"
		].filter((type) => tags.includes("ai-generated-" + type));
		for (const tag of tags) {
			const match = tag.match(/^ai-generated(?:-(?<type>.*))?$/);
			if (match) {
				hasai = true;
				const type = match.groups.type;
				if (type && !aitypes.includes(type)) aitypes.push(type);
			}
		}
		return {hasai, aitypes};
	}

	function generateTypeDescription(aitypes) {
		const list = [...aitypes.slice(0, -2), aitypes.slice(-2).join(" and ")].join(", ") || "content";
		return `The creator of this product has specified that it contains AI-generated ${list}.`;
	}

	function injectStyle() {
		const style = document.createElement("style");
		style.innerHTML = `
			.aiwarning_active {
				-webkit-animation-play-state: paused !important;
				-moz-animation-play-state: paused !important;
				-o-animation-play-state: paused !important;
				animation-play-state: paused !important;
			}
			.aiwarning_container {
				position: fixed;
				inset: 0px;
				backdrop-filter: blur(25px);
				background-color: rgba(0, 0, 0, 0.6);
				z-index: 2000;
				display: flex;
				justify-content: center;
				align-items: center;
				transition: opacity 150ms;
				animation: none;
			}
			.aiwarning_popup {
				color: #CACACA;
				background-color: #1B1B1B;
				padding: 30px 40px;
				border-radius: 5px;
				box-shadow: 0px 0px 10px #000000;
				position: relative;
				font-family: Lato, sans-serif;
				max-width: 900px;
				box-sizing: border-box;
				border-top: 1px solid #FF2449;
			}
			.aiwarning_popup h2 {
				margin: 0 15px 0 0;
				font-size: 22px;
			}
			.aiwarning_popup p {
				font-size: 16px;
			}
			.aiwarning_bottomrow {
				display: flex;
				justify-content: right;
			}
			.aiwarning_close_corner {
				position: absolute;
				top: 10px;
				right: 10px;
				width: 18px;
				height: 18px;
				fill: none;
				stroke: #CACACA;
				stroke-width: 2px;
				stroke-linecap: round;
				cursor: pointer;
			}
			.aiwarning_close_corner:hover {
				stroke: white;
			}
			.aiwarning_watermark {
				position: absolute;
				left: 10px;
				bottom: 10px;
				color: white;
				opacity: 0.25;
				text-decoration: none;
				font-size: 12px;
			}
			.aiwarning_watermark:hover {
				opacity: 0.6;
				color: #FF2449;
			}
		`;
		document.head.append(style);
		return style;
	}

	function getMetadata() {
		const metadata = {};
		if (typeof GM_info !== "undefined") {
			metadata.homepage = GM_info.script.homepage;
			metadata.name = GM_info.script.name;
			metadata.version = GM_info.script.version;
		} else if (typeof browser !== "undefined") {
			metadata.homepage = browser.runtime.getManifest().homepage_url;
			metadata.name = browser.runtime.getManifest().name;
			metadata.version = browser.runtime.getManifest().version;
		} else if (typeof chrome !== "undefined") {
			metadata.homepage = chrome.runtime.getManifest().homepage_url;
			metadata.name = chrome.runtime.getManifest().name;
			metadata.version = chrome.runtime.getManifest().version;
		}
		return metadata;
	}

	function createWarning(title, aitypes) {
		const style = injectStyle();
		const {homepage, name, version} = getMetadata();
		const container = document.createElement("div");
		container.classList.add("aiwarning_container");
		container.innerHTML = `
			<div class="aiwarning_popup">
				<svg class="aiwarning_close aiwarning_close_corner" viewBox="0 0 24 24">
					<line x1="6" y1="6" x2="18" y2="18"></line>
					<line x1="18" y1="6" x2="6" y2="18"></line>
				</svg>
				<h2>${title || "Product"} contains AI-generated content</h2>
				<p>${generateTypeDescription(aitypes)}</p>
				<div class="aiwarning_bottomrow">
					<button class="aiwarning_close button">Close</button>
				</div>
				<a href="${homepage}" class="aiwarning_watermark">${name} v${version}</a>
			</div>
		`;
		function closeWarning() {
			container.remove();
			style.remove();
		}
		container.querySelectorAll(".aiwarning_close").forEach(element => element.addEventListener("click", event => closeWarning()));
		container.addEventListener("click", event => {
			if (event.target === container) closeWarning();
		});
		container.style.opacity = 0;
		document.body.append(container);
		container.offsetWidth; // workaround to make sure the transition triggers
		container.style.opacity = 1;
	}

	const {title, tags} = await fetchData();
	const {hasai, aitypes} = checkAITags(tags);
	const warning = document.querySelector(".aiwarning_container");
	if (hasai && !warning) {
		createWarning(title, aitypes);
	}

})();