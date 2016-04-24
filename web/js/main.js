"use strict";

document.addEventListener("DOMContentLoaded", function() {

	var txtNewItem = document.getElementById("txt_new_item");
	var lstItems = document.getElementById("lst_items");

	var storageKey = "shopping-list";

	var idSet = {};

	var itemList = [];

	initFromStorage();

	// Event handlers

	document.getElementById("btn_new_item").addEventListener("click", function() {
		var value = txtNewItem.value.trim();

		if (value == "") {
			return;
		}

		var id = getUniqueId();

		// Add to UI.
		var listItem = createVisualItem(value, id);

		// Make sure newly added item is immediately visible.
		listItem.scrollIntoView();

		// Add to internal storage.
		addItem(value, id);

		// Reset input.
		txtNewItem.value = "";
		txtNewItem.focus();
	}, false);

	document.getElementById("context_action_remove_all_checked").addEventListener("click", function() {
		var children = Array.prototype.slice.call(lstItems.childNodes);
		children.forEach(function(child) {
			if (child.nodeName == "LI") {
				var label = child.firstChild;
				if (label.nodeName == "LABEL" && label.classList.contains("is-checked")) {
					lstItems.removeChild(child);

					removeItemWithoutStoring(child.id);
				}
			}
		});

		saveToStorage();
	}, false);

	document.getElementById("context_action_remove_all").addEventListener("click", function() {
		while (lstItems.firstChild) {
			lstItems.removeChild(lstItems.firstChild);
		}

		clearAllItems();
	}, false);

	lstItems.addEventListener("click", function(event) {
		if (event.target && event.target.nodeName == "INPUT"
			&& event.target.parentElement && event.target.parentElement.nodeName == "LABEL"
			&& event.target.parentElement.parentElement && event.target.parentElement.parentElement.nodeName == "LI") {

			var id = event.target.parentElement.parentElement.id;
			updateItem(id, function(item) {
				item.done = event.target.checked;
			});
		}
	}, false);

	function createVisualItem(text, id, done) {
		// Create UI entry.
		var listItem = document.createElement("li");
		listItem.className = "mdl-list__item";
		listItem.id = id;
		var label = document.createElement("label");
		label.className = "mdl-list__item-primary-content mdl-checkbox mdl-js-checkbox mdl-js-ripple-effect";
		listItem.appendChild(label);
		var input = document.createElement("input");
		input.type = "checkbox";
		input.className = "mdl-checkbox__input";
		if (done) {
			input.checked = true;
		}
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

	// Persistence

	function initFromStorage() {
		var storage = localStorage.getItem(storageKey);
		if (storage) {
			var shoppingList = JSON.parse(storage);
			itemList = shoppingList.itemList;

			itemList.forEach(function(item) {
				addExistingId(item.id);
				createVisualItem(item.text, item.id, item.done);
			});
		}
	}

	function saveToStorage() {
		var shoppingList = {
			itemList: itemList
		};
		var storage = JSON.stringify(shoppingList);
		localStorage.setItem(storageKey, storage);
	}

	function addItem(text, id) {
		itemList.push({
			text: text,
			done: false,
			id: id
		});
		saveToStorage();
	}

	function updateItem(id, updater) {
		// .find would be nicer here but isn't as widely supported.
		itemList.forEach(function(item) {
			if (item.id == id) {
				updater(item);
			}
		});

		saveToStorage();
	}

	function removeItemWithoutStoring(id) {
		itemList = itemList.filter(function(item) {
			return item.id != id;
		});
	}

	function clearAllItems() {
		itemList = [];
		saveToStorage();
	}

	// Id generation

	function addExistingId(id) {
		idSet[id] = true;
	}

	function getUniqueId() {
		var maxValue = Number.MAX_SAFE_INTEGER || Math.pow(2, 53) - 1;
		var id;
		do {
			id = "id" + Math.floor(Math.random() * maxValue);
		} while(idSet[id]);
		idSet[id] = true;
		return id;
	}
});