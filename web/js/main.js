document.addEventListener("DOMContentLoaded", function() {
	var txtNewItem = document.getElementById("txt_new_item");
	var lstItems = document.getElementById("lst_items");

	document.getElementById("btn_new_item").addEventListener("click", function() {
		var value = txtNewItem.value.trim();

		if (value == "") {
			return;
		}

		var listItem = createVisualItem(value);

		// Make sure newly added item is immediately visible.
		listItem.scrollIntoView();

		// Reset input.
		txtNewItem.value = "";
		txtNewItem.focus();
	}, false);

	document.getElementById("context_action_remove_all_checked").addEventListener("click", function() {
		var children = Array.prototype.slice.call(lstItems.childNodes);
		children.forEach(function(child) {
			if (child.nodeName == "LI") {
				var label = child.firstChild;
				if (label.nodeName = "LABEL" && label.classList.contains("is-checked")) {
					lstItems.removeChild(child);
				}
			}
		});
	}, false);

	document.getElementById("context_action_remove_all").addEventListener("click", function() {
		while (lstItems.firstChild) {
			lstItems.removeChild(lstItems.firstChild);
		}
	}, false);

	function createVisualItem(text) {
		// Create UI entry.
		var listItem = document.createElement("li");
		listItem.className = "mdl-list__item";
		var label = document.createElement("label");
		label.className = "mdl-list__item-primary-content mdl-checkbox mdl-js-checkbox mdl-js-ripple-effect";
		listItem.appendChild(label);
		var input = document.createElement("input");
		input.type = "checkbox";
		input.className = "mdl-checkbox__input";
		label.appendChild(input);
		var span = document.createElement("span");
		span.className = "mdl-checkbox__label";
		label.appendChild(span);
		var textNode = document.createTextNode(text);
		span.appendChild(textNode);
		lstItems.appendChild(listItem);

		// Make MDL enhance the element.
		componentHandler.upgradeElement(label);

		return listItem;
	}
});