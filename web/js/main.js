"use strict";

document.addEventListener("DOMContentLoaded", function() {

	var STORAGE_KEY = "shopping-list";
	var SERVICE_WORKER_SCOPE = location.pathname;
	var LONG_PRESS_DURATION = 300;
	var LONG_PRESS_VIBRATION_DURATION = 50;

	var txtNewItem = document.getElementById("txt_new_item");
	var lstItems = document.getElementById("lst_items");

	var idSet = {};

	var itemList = [];

	var longPressTimer = null;

	var itemPressed = null;

	initFromStorage();

	// Install service worker for offline support.
	if ("serviceWorker" in navigator) {
		navigator.serviceWorker
			.register("service-worker.js", {
				scope: SERVICE_WORKER_SCOPE
			})
			.then(function() {
				console.log("Service Worker registered.");
			})
			.catch(function(error) {
				console.log("Error registering Service Worker.");
				console.log(error);
			});
	} else {
		console.log("No offline support. :-(");
	}

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
		if (longPressTimer) {
			clearTimeout(longPressTimer);
		}
		if (itemPressed) {
			return;
		}

		if (event.target && event.target.nodeName == "INPUT"
			&& event.target.parentElement && event.target.parentElement.nodeName == "LABEL"
			&& event.target.parentElement.parentElement && event.target.parentElement.parentElement.nodeName == "LI") {

			var id = event.target.parentElement.parentElement.id;
			updateItem(id, function(item) {
				item.done = event.target.checked;
			});
		}
	}, false);

	lstItems.addEventListener("mousedown", function(event) {
		itemPressed = null;
		if (longPressTimer) {
			clearTimeout(longPressTimer);
		}

		var listItem = event.target;
		while (listItem.nodeName != "LI" && listItem.parentElement) {
			listItem = listItem.parentElement;
		}

		listItem.classList.add("long_press");

		longPressTimer = setTimeout(function() {
			itemPressed = event.target;

			var activateLongPress = function() {
				listItem.classList.remove("long_press");
				requestTextChange(listItem);
			}

			if (navigator.vibrate) {
				navigator.vibrate(LONG_PRESS_VIBRATION_DURATION);
				setTimeout(activateLongPress, LONG_PRESS_VIBRATION_DURATION);
			} else {
				activateLongPress();
			}
		}, LONG_PRESS_DURATION);
	}, false);

	lstItems.addEventListener("mouseup", function(event) {
		if (longPressTimer) {
			var listItem = event.target;
			while (listItem.nodeName != "LI" && listItem.parentElement) {
				listItem = listItem.parentElement;
			}
			listItem.classList.remove("long_press");

			clearTimeout(longPressTimer);
		}
	}, false);

	lstItems.addEventListener("mouseout", function(event) {
		if (event.target.nodeName == "LI" && event.target.classList.contains("long_press")) {
			event.target.classList.remove("long_press");
			if (longPressTimer) {
				clearTimeout(longPressTimer);
			}
		}
	}, false);

	lstItems.addEventListener("slip:beforeswipe", function(event) {
		// Drag handle can't be used for swiping element out of the list.
		if (event.target.classList.contains("drag_handle")) {
			event.preventDefault();
		}
	}, false);

	lstItems.addEventListener("slip:swipe", function(event) {
		// When element was swiped out of the list, remove it from the DOM and from the data structure.
		event.target.parentNode.removeChild(event.target);
		removeItem(event.target.id);
	}, false);

	lstItems.addEventListener("slip:beforewait", function(event) {
		// Drag handle will be dragged (instead of page scrolling).
		if (event.target.classList.contains("drag_handle")) {
			event.preventDefault();
		}

		// In Chrome on Android when the text field has the focus while you try to drag and drop in the list it pops up the keyboard.
		// This can be prevented by blurring it but that still cancels the interaction with the list somehow.
		// At least it will work fine after that and you don't have to manually close the keyboard again.
		txtNewItem.blur();
	}, false);

	lstItems.addEventListener("slip:beforereorder", function(event) {
		// Make sure reordering can only happen by using the drag handle.
		if (!event.target.classList.contains("drag_handle")) {
			event.preventDefault();
		}
	}, false);

	lstItems.addEventListener("slip:reorder", function(event) {
		// When element was moved to a new position using the drag handle,
		// permanently move it to that place in the DOM and change the data structure accordingly.
		event.target.parentNode.insertBefore(event.target, event.detail.insertBefore);
		reorderElements(event.detail.originalIndex, event.detail.spliceIndex);
	}, false);

	// Add drag&drop behaviour to list items.
	new Slip(lstItems);

	function createVisualItem(text, id, done) {
		// Create UI entry.

		var listItem = document.createElement("li");
		listItem.className = "mdl-list__item";
		listItem.id = id;
		lstItems.appendChild(listItem);

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
		span.appendChild(document.createTextNode(text));
		label.appendChild(span);

		var secondaryAction = document.createElement("a");
		secondaryAction.href = "#";
		secondaryAction.className = "mdl-list__item-secondary-action drag_handle";
		listItem.appendChild(secondaryAction);

		var dragIcon = document.createElement("i");
		dragIcon.className = "material-icons mdl-list__item-icon drag_handle";
		dragIcon.appendChild(document.createTextNode("drag_handle"));
		secondaryAction.appendChild(dragIcon);

		// Make MDL enhance the element.
		componentHandler.upgradeElement(label);

		return listItem;
	}

	function requestTextChange(element) {
		var item = getItem(element.id);
		if (item) {
			var oldValue = item.text;
			var newText = prompt("Please enter a new text.", oldValue);
			if (newText) {
				var span = element.querySelector(".mdl-checkbox__label");
				span.textContent = newText;
				item.text = newText;
				saveToStorage();
			}
		}
	}

	// Persistence

	function initFromStorage() {
		var storage = localStorage.getItem(STORAGE_KEY);
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
		localStorage.setItem(STORAGE_KEY, storage);
	}

	function getItem(id) {
		var singleItemList = itemList.filter(function(item) {
			return item.id == id;
		});
		if (singleItemList.length) {
			return singleItemList[0];
		}
		return null;
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

	function removeItem(id) {
		removeItemWithoutStoring(id);
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

	function reorderElements(originalIndex, newIndex) {
		// http://stackoverflow.com/a/5306832
		itemList.splice(newIndex, 0, itemList.splice(originalIndex, 1)[0]);
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