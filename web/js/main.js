"use strict";

document.addEventListener("DOMContentLoaded", function() {

	var STORAGE_KEY = "shopping-list";
	var SERVICE_WORKER_SCOPE = location.pathname;
	var LONG_PRESS_DURATION = 300;
	var LONG_PRESS_VIBRATION_DURATION = 50;

	var txtNewItem = document.getElementById("txt_new_item");
	var lstItems = document.getElementById("lst_items");
	var navMenu = document.getElementById("navigation_menu");
	var btnAddNewList = document.getElementById("menu_action_add_new_list");
	var lblTitleElement = document.getElementById("active_list_title");
	var layout = document.querySelector(".mdl-layout");
	var btnUndo = document.getElementById("context_action_undo");
	var btnRenameList = document.getElementById("context_action_rename_list");
	var btnDeleteList = document.getElementById("context_action_delete_list");

	var initialListName = lblTitleElement.dataset.initialListName;
	var changeItemTextPromptMessage = lstItems.dataset.changeItemTextPromptMessage;

	var idSet = {};

	var activeList = {};
	var allLists = [];

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

	// Cancel mousedown event on button to stop it from stealing the focus from the text field
	// and thus closing the keyboard.
	document.getElementById("btn_new_item").addEventListener("mousedown", function(event) {
		event.preventDefault();
		event.stopPropagation();
	}, false);

	document.getElementById("form_new_item").addEventListener("submit", function(event) {
		// Prevent form submission.
		event.preventDefault();
		event.stopPropagation();

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
	}, false);

	btnUndo.addEventListener("click", function() {
		// Update internal storage.
		restorePreviousStateOfActiveList();

		// Update UI.

		showActiveListName(activeList.currentState.name);

		var navItem = navMenu.querySelector("[data-list-id=" + activeList.id + "]");
		navItem.textContent = activeList.currentState.name;

		emptyVisualList();

		activeList.currentState.items.forEach(function(item) {
			createVisualItem(item.text, item.id, item.done);
		});

		// Call this with a timeout so that MDL's event handler can go through first.
		// Otherwise that won't accept the click because the menu item is disabled,
		// and therefore not close the context menu.
		setTimeout(function() {
			setUndoEnabled(activeList.previousStates.length > 0);
		}, 0);
	}, false);

	document.getElementById("context_action_remove_all_checked").addEventListener("click", function() {
		saveCurrentStateOfActiveList();

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
		// Update UI.
		emptyVisualList();

		// Update internal storage.
		clearAllItems();
	}, false);

	btnRenameList.addEventListener("click", function() {
		var oldValue = activeList.currentState.name;
		var newName = prompt(btnRenameList.dataset.renamePromptMessage, oldValue);
		if (newName) {
			// Update UI.

			showActiveListName(newName);

			var navItem = navMenu.querySelector("[data-list-id=" + activeList.id + "]");
			navItem.textContent = newName;

			// Update internal storage.
			renameActiveList(newName);
		}
	}, false);

	btnDeleteList.addEventListener("click", function() {
		if (confirm(btnDeleteList.dataset.deleteConfirmMessage)) {
			// Update UI.

			emptyVisualList();

			var navItem = navMenu.querySelector("[data-list-id=" + activeList.id + "]");
			navMenu.removeChild(navItem);

			// Update internal storage.
			deleteActiveList();

			// TODO mark new active list in menu.
		}
	}, false);

	btnAddNewList.addEventListener("click", function(event) {
		var name = prompt(btnAddNewList.dataset.addPromptMessage, initialListName);
		if (name) {
			createAndLoadList(name);
		}

		// Close sidebar menu.
		layout.MaterialLayout.toggleDrawer();

		event.preventDefault();
		event.stopPropagation();
	}, false);

	navMenu.addEventListener("click", function(event) {
		if (event.target && event.target.classList.contains("nav_item")) {
			emptyVisualList();

			var listId = event.target.dataset.listId;
			switchToList(listId);
		}

		// Close sidebar menu.
		layout.MaterialLayout.toggleDrawer();

		// TODO mark new active list in menu.

		event.preventDefault();
	});

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
		reorderItems(event.detail.originalIndex, event.detail.spliceIndex);
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
			var newText = prompt(changeItemTextPromptMessage, oldValue);
			if (newText) {
				var span = element.querySelector(".mdl-checkbox__label");
				span.textContent = newText;
				saveCurrentStateOfActiveList();
				item.text = newText;
				saveToStorage();
			}
		}
	}

	function showActiveListName(name) {
		lblTitleElement.textContent = name;
	}

	function emptyVisualList() {
		while (lstItems.firstChild) {
			lstItems.removeChild(lstItems.firstChild);
		}
	}

	function addListToMenu(list) {
		var navItem = document.createElement("a");
		navItem.href = "#";
		navItem.className = "mdl-navigation__link nav_item";
		navItem.dataset.listId = list.id;
		navItem.appendChild(document.createTextNode(list.currentState.name));
		navMenu.insertBefore(navItem, btnAddNewList);
	}

	function setUndoEnabled(enabled) {
		if (enabled) {
			btnUndo.removeAttribute("disabled");
		} else {
			btnUndo.setAttribute("disabled", "true");
		}
	}


	// Persistence

	function initFromStorage() {
		var storage = localStorage.getItem(STORAGE_KEY);
		var shoppingList;
		if (storage) {
			shoppingList = JSON.parse(storage);
		} else {
			shoppingList = {};
		}

		if (shoppingList.lists) {
			allLists = shoppingList.lists;

			allLists.forEach(function(list) {
				if (list.id == shoppingList.activeListId) {
					loadList(list, true);
				}

				addListToMenu(list);

				addExistingId(list.id);
			});
		} else {
			allLists = [];
		}

		if (!shoppingList.activeListId) {
			createAndLoadList(initialListName);
		}

		if (!shoppingList.activeListId || !shoppingList.lists) {
			saveToStorage();
		}
	}

	function saveToStorage() {
		var shoppingList = {
			"activeListId": activeList.id,
			"lists": allLists
		};
		var storage = JSON.stringify(shoppingList);
		localStorage.setItem(STORAGE_KEY, storage);
	}

	// List management

	function createAndLoadList(name) {
		var newList = createList(name);

		allLists.push(newList);

		loadList(newList);

		addListToMenu(newList);
	}

	function createList(name) {
		return {
			id: getUniqueId(),
			currentState: {
				name: name,
				items: []
			},
			previousStates: []
		};
	}

	function loadList(list, addExistingIds) {
		activeList = list;

		showActiveListName(list.currentState.name);

		list.currentState.items.forEach(function(item) {
			if (addExistingIds) {
				addExistingId(item.id);
			}
			createVisualItem(item.text, item.id, item.done);
		});

		setUndoEnabled(list.previousStates.length > 0);
	}

	function getList(id) {
		var foundList = null;
		// .find would be nicer here but isn't as widely supported.
		allLists.forEach(function(list) {
			if (list.id == id) {
				foundList = list;
			}
		});
		return foundList;
	}

	function switchToList(id) {
		var list = getList(id);
		if (list) {
			loadList(list);
			saveToStorage();
		}
	}

	// Managing active list

	function deleteActiveList() {
		if (activeList) {
			for (var i = 0; i < allLists.length; i++) {
				if (allLists[i].id == activeList.id) {
					allLists.splice(i, 1);
					break;
				}
			}

			if (allLists.length) {
				loadList(allLists[0]);
			} else {
				createAndLoadList(initialListName);
			}

			saveToStorage();
		}
	}

	function renameActiveList(newName) {
		saveCurrentStateOfActiveList();
		activeList.currentState.name = newName;
		saveToStorage();
	}

	function saveCurrentStateOfActiveList() {
		// Deep copy (rather than Object.assign which is shallow).
		// Not using JSON stringifying/parsing because it's slow.
		// Not using a more generic function because the structure is quite simple.
		var state = {
			name: activeList.currentState.name,
			items: []
		};
		activeList.currentState.items.forEach(function(item) {
			var itemCopy = {
				text: item.text,
				done: item.done,
				id: item.id
			};
			state.items.push(itemCopy);
		})
		activeList.previousStates.push(state);

		setUndoEnabled(true);
	}

	function restorePreviousStateOfActiveList() {
		if (activeList.previousStates.length) {
			var previousState = activeList.previousStates.pop();
			activeList.currentState = previousState;
			saveToStorage();
		}
	}

	// Managing items in active list

	function getItem(id) {
		var singleItemList = activeList.currentState.items.filter(function(item) {
			return item.id == id;
		});
		if (singleItemList.length) {
			return singleItemList[0];
		}
		return null;
	}

	function addItem(text, id) {
		saveCurrentStateOfActiveList();
		activeList.currentState.items.push({
			text: text,
			done: false,
			id: id
		});
		saveToStorage();
	}

	function updateItem(id, updater) {
		saveCurrentStateOfActiveList();
		// .find would be nicer here but isn't as widely supported.
		activeList.currentState.items.forEach(function(item) {
			if (item.id == id) {
				updater(item);
			}
		});
		saveToStorage();
	}

	function removeItem(id) {
		saveCurrentStateOfActiveList();
		removeItemWithoutStoring(id);
		saveToStorage();
	}

	function removeItemWithoutStoring(id) {
		activeList.currentState.items = activeList.currentState.items.filter(function(item) {
			return item.id != id;
		});
	}

	function clearAllItems() {
		saveCurrentStateOfActiveList();
		activeList.currentState.items = [];
		saveToStorage();
	}

	function reorderItems(originalIndex, newIndex) {
		saveCurrentStateOfActiveList();
		// http://stackoverflow.com/a/5306832
		activeList.currentState.items.splice(newIndex, 0, activeList.currentState.items.splice(originalIndex, 1)[0]);
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

	// Ideally would have to remove ids from idSet when restoring an older state or deleting items or a list,
	// but it's not really worth the hassle, since the space of possible ids is big enough and the set gets
	// reinitialised when starting the app.
});