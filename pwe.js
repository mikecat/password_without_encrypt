"use strict";

window.addEventListener("DOMContentLoaded", function() {
	const mainForm = document.getElementById("mainForm");
	const statusField = document.getElementById("statusField");
	const downloader = document.getElementById("downloader");

	const escapeHTML = function(str) {
		return str
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&rt;")
			.replace(/"/g, "&quot;") // " <- sakura editor hack
			.replace(/'/g, "&#39;");
	};

	const escapeJS = function(str) {
		return str
			.replace(/\\/g, "\\\\")
			.replace(/</g, "\\x3C")
			.replace(/>/g, "\\x3E")
			.replace(/"/g, "\\\"")
			.replace(/'/g, "\\'");
	};

	const replaceTemplate = function(template, vars) {
		let done = "";
		for (;;) {
			const nextPos = template.indexOf("{{");
			if (nextPos < 0) {
				return done + template;
			}
			const nextPosEnd = template.indexOf("}}", nextPos);
			if (nextPosEnd < 0) {
				console.warn("unclosed template specifier detected");
				return done + template;
			}
			done += template.substring(0, nextPos);
			const key = template.substring(nextPos + 2, nextPosEnd);
			template = template.substring(nextPosEnd + 2);
			if (key in vars) {
				done += vars[key];
			} else {
				console.warn("key " + key + " not found");
			}
		}
	};

	// テンプレートを読み込む
	const xhr = new XMLHttpRequest();
	xhr.open("GET", "template.txt");
	xhr.addEventListener("load", function() {
		if (xhr.status < 200 || 300 <= xhr.status) {
			// エラー
			statusField.setAttribute("data-status", "templateLoadError");
			return;
		}
		const template = xhr.response;
		mainForm.inputFile.disabled = false;
		mainForm.password1.disabled = false;
		mainForm.password2.disabled = false;
		mainForm.submit.disabled = false;
		mainForm.inputFile.addEventListener("change", function() {
			statusField.setAttribute("data-status", "");
		});
		mainForm.password1.addEventListener("change", function() {
			statusField.setAttribute("data-status", "");
		});
		mainForm.password2.addEventListener("change", function() {
			statusField.setAttribute("data-status", "");
		});

		let prevURL = null;
		mainForm.addEventListener("submit", function(e) {
			e.preventDefault();
			statusField.setAttribute("data-status", "");
			const password = mainForm.password1.value;
			if (password !== mainForm.password2.value) {
				statusField.setAttribute("data-status", "passwordMismatch");
				return;
			}
			if (!mainForm.inputFile.files || mainForm.inputFile.files.length === 0) {
				statusField.setAttribute("data-status", "noFileSelected");
				return;
			}
			const file = mainForm.inputFile.files[0];
			const fr = new FileReader();
			fr.addEventListener("load", function() {
				const fileName = file.name;
				const fileData = fr.result;
				const fileDataEncoded = btoa(fileData);
				const result = replaceTemplate(template, {
					"filename-html": escapeHTML(fileName),
					"filedata-base64": fileDataEncoded,
					"password-raw-js": escapeJS(password)
				});
				const resultBlob = new Blob([result], {"type": "text/html"});
				const resultURL = URL.createObjectURL(resultBlob);
				downloader.setAttribute("download", fileName + ".html");
				downloader.setAttribute("href", resultURL);
				if (prevURL !== null) URL.revokeObjectURL(prevURL);
				prevURL = resultURL;
				downloader.click();
			});
			fr.addEventListener("error", function() {
				statusField.setAttribute("data-status", "fileLoadError");
			});
			fr.readAsBinaryString(file);
		});
	});
	xhr.addEventListener("error", function() {
		statusField.setAttribute("data-status", "templateLoadError");
	});
	xhr.send();
});
