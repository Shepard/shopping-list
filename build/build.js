const Handlebars = require("handlebars");
const fs = require("fs");

fs.readFile("build/index.hbs", "utf-8", (error, templateData) => {
	if (error) {
		console.log(error);
		throw error;
	}

	const template = Handlebars.compile(templateData);

	fs.readFile("build/translations.json", "utf-8", (error, translationsData) => {
		const translations = JSON.parse(translationsData);

		Object.getOwnPropertyNames(translations).forEach(lang => {
			var data = Object.assign({}, translations[lang], { lang });
			const html = template(data);
			const fileName = "web/index.html." + lang;
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
