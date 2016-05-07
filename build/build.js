const Handlebars = require("handlebars");
const fs = require("fs");

function buildTranslatedFiles(sourceFile, translationsFile, targetFilePattern) {
	fs.readFile(sourceFile, "utf-8", (error, templateData) => {
		if (error) {
			console.log(error);
			throw error;
		}

		const template = Handlebars.compile(templateData);

		fs.readFile(translationsFile, "utf-8", (error, translationsData) => {
			const translations = JSON.parse(translationsData);

			Object.getOwnPropertyNames(translations).forEach(lang => {
				var data = Object.assign({}, translations[lang], { lang });
				const html = template(data);
				const fileName = targetFilePattern + lang;
				fs.writeFile(fileName, html, error => {
					if (error) {
						console.log(error);
						throw error;
					}
					console.log("Written " + fileName);
				});
			});
		});
	});
}

buildTranslatedFiles("build/index.hbs", "build/index.translations.json", "web/index.html.");
buildTranslatedFiles("build/manifest.hbs", "build/manifest.translations.json", "web/manifest.json.");