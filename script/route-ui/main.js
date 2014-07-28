﻿/*global define*/
define([
	"dojo/Evented", 
	"dojo/_base/declare",
	"dojo/text!./data/sync/Attribute Parameter Values.txt",
	"dojo/text!./data/async/Attribute Parameter Values.txt",
	"dojo/text!./data/sync/Attribute Names.txt",
	"dojo/text!./data/async/Restrictions.txt"
], function (Evented, declare, syncValues, asyncValues, syncDescriptions, asyncDescriptions) {

	var usedIds = [];

	// Add an Array.contains function if it does not already exist.
	if (!Array.prototype.contains) {
		/**
		 * Determines if the array contains the given item
		 * @param {string} item
		 * @returns {Array}
		 */
		Array.prototype.contains = function (item) {
			var output = false;
			for (var i = 0, l = this.length; i < l; i += 1) {
				if (this[i] === item) {
					output = true;
					break;
				}
			}
			return output;
		};
	}

	/**
	 * Generates a unique ID based on an input string.
	 * @param {string} base
	 * @returns {string}
	 */
	function createId(base) {
		var output, i = 0;
		base = base || "id_";
		if (/^[^a-z_]/i.test(base)) {
			base = "id_" + base;
		}

		base = base.replace(/\W+/g, "_");

		output = base;

		while (usedIds.contains(output) || document.getElementById(output)) {
			output = [base, i].join("_");
			i += 1;
		}

		usedIds.push();
		return output;
	}

	var restrictionParameters = {
		/** @member {number} Travel on the roads using the restriction is completely prohibited.*/
		Prohibited: -1,
		/** @member {number} It is very unlikely for the service to include in the route the roads that are associated with the restriction.*/
		Avoid_High: 5,
		/** @member {number} It is unlikely for the service to include in the route the roads that are associated with the restriction.*/
		Avoid_Medium: 2,
		/** @member {number} It is somewhat unlikely for the service to include in the route the roads that are associated with the restriction.*/
		Avoid_Low: 1.3,
		/** @member {number} It is somewhat likely for the service to include in the route the roads that are associated with the restriction.*/
		Prefer_Low: 0.8,
		/** @member {number} It is likely for the service to include in the route the roads that are associated with the restriction.*/
		Prefer_Medium: 0.5,
		/** @member {number} It is very likely for the service to include in the route the roads that are associated with the restriction. */
		Prefer_High: 0.2,
	};

	/**
	 * Creates a restriction parameter value select element.
	 * @param {string} defaultValue
	 * @returns {HTMLSelectElement}
	 */
	function createSelect(defaultValue) {
		var select, option, re, selected, avoidGroup, preferGroup, avoidRe = /^Avoid/i, preferRe = /^Prefer/;
		re = new RegExp(defaultValue, "i");
		select = document.createElement("select");
		avoidGroup = document.createElement("optgroup");
		avoidGroup.label = "Avoid";
		select.appendChild(avoidGroup);
		preferGroup = document.createElement("optgroup");
		preferGroup.label = "Prefer";
		select.appendChild(preferGroup);
		for (var name in restrictionParameters) {
			if (restrictionParameters.hasOwnProperty(name)) {
				option = document.createElement("option");
				option.value = restrictionParameters[name];
				option.label = name;
				option.textContent = name;
				if (name.match(re)) {
					selected = document.createAttribute("selected");
					option.setAttributeNode(selected);
					option.classList.add("default");
				}
				(avoidRe.test(name) ? avoidGroup : preferRe.test(name) ? preferGroup : select).appendChild(option);
			}
		}
		return select;
	}

	/**
	 * @param {*} value
	 * @param {string} propertyName
	 * @returns {HTMLDivElement}
	 */
	function createParameterValueControlDiv(value, propertyName) {
		var div, label, control;

		div = document.createElement("div");
		div.classList.add("form-group");

		label = document.createElement("label");
		label.textContent = propertyName;
		div.appendChild(label);

		if (propertyName === "Restriction Usage") {
			control = createSelect(value);
		} else {
			control = document.createElement("input");
			control.type = "number";
			control.defaultValue = value;
			control.value = value;
		}
		control.id = createId(propertyName);
		label.htmlFor = control.id;
		control.classList.add("form-control");
		div.appendChild(control);

		return div;
	}

	/**
	 * @param {Object} obj
	 * @param {string} restrictionParameterName
	 * @returns {HTMLDivElement}
	 */
	function createRestrictionControlsDiv(obj, restrictionParameterName) {
		var div, checkbox, label, innerDiv, controlContainer;
		div = document.createElement("div");
		label = document.createElement("label");
		checkbox = document.createElement("input");
		checkbox.type = "checkbox";
		checkbox.id = createId(restrictionParameterName);
		label.htmlFor = checkbox.id;
		label.appendChild(document.createTextNode(restrictionParameterName));
		div.appendChild(checkbox);
		div.appendChild(label);
		controlContainer = document.createElement("div");
		controlContainer.classList.add("container");
		div.appendChild(controlContainer);
		for (var propName in obj) {
			if (obj.hasOwnProperty(propName)) {
				innerDiv = createParameterValueControlDiv(obj[propName], propName);
				controlContainer.appendChild(innerDiv);
			}
		}
		return div;
	}

	/**
	 * Creates a form based on the object generated by the parseTabSeparatedData function.
	 * @param {Object} obj
	 * @return {HTMLFormElement}
	 */
	function createFormFromObjectProperties(obj) {
		var form, innerObj, propName, div, submitButton, resetButton, stopList;

		form = document.createElement("form");
		form.setAttribute("role", "form");
		form.action = "#";

		stopList = document.createElement("ol");
		stopList.classList.add("stop-list");
		form.appendChild(stopList);

		for (propName in obj) {
			if (obj.hasOwnProperty(propName)) {
				innerObj = obj[propName];
				div = createRestrictionControlsDiv(innerObj, propName);
				form.appendChild(div);
			}
		}

		submitButton = document.createElement("button");
		submitButton.type = "submit";
		submitButton.innerText = "Submit";
		form.appendChild(submitButton);

		resetButton = document.createElement("button");
		resetButton.type = "reset";
		resetButton.innerText = "Reset";
		form.appendChild(resetButton);

		return form;
	}

	/**
	 * Converts the data from a text table into an object.
	 * The values from the first column become the property names.
	 * Each of these properties is an object with one or more properties.
	 * The names of these inner properties come from the second column,
	 * and the values come from the third column.
	 * @param {string} text - text from a tab-separated table.
	 * @returns {Object}
	 */
	function parseTabSeparatedData(text) {
		var re = /^([^\t\n\r]+)\t([^\t\r\n]+)\t([^\t\r\n]+)$/gm; // Matches ["restriction name", "parameter name", "default value"]
		var match;
		var output = {};
		match = re.exec(text);
		// Skip first row: column headings.
		match = re.exec(text);
		while (match) {
			// Remove the first element: the complete match.
			match = match.slice(1);

			if (!output.hasOwnProperty(match[0])) {
				output[match[0]] = {};
			}
			output[match[0]][match[1]] = match[2];

			match = re.exec(text);
		}
		return output;
	}

	/**
	 * @typedef {RestrictionInfo}
	 * @propery {string} description - A description of the restriction.
	 * @property {string} availability - The availability of the restriction.
	 */

	/**
	 * Parses the descriptions text table.
	 * @param {string} text
	 * @returns {Object.<string, RestrictionInfo>}
	 */
	function parseDescriptions(text) {
		var re = /^([^\t\n\r]+)\t([^\t\r\n]+)\t([^\t\r\n]+)$/gm; // Matches ["restriction name", "description", "availability"]
		var match;
		var output = {};
		match = re.exec(text);
		// Skip first row: column headings.
		match = re.exec(text);
		while (match) {
			// Remove the first element: the complete match.
			match = match.slice(1);

			output[match[0]] = {
				description: match[1],
				availability: match[2]
			};

			match = re.exec(text);
		}
		return output;
	}

	/**
	 * Removes a list item from a list.
	 * Called from a link that is the child of
	 * a list item.
	 * @param {Event} e
	 * @param {HTMLAnchorElement} e.target
	 */
	function removeItemFromList(e) {
		var link = e.target;
		var listItem = link.parentElement;
		var list = listItem.parentElement;
		list.removeChild(listItem);

		return false;
	}

	function createStopListItem(stop) {
		var li, removeLink, feature;
		console.log("stop", stop);
		if (stop.feature) {
			if (stop.feature.toJson) {
				feature = stop.feature.toJson();
			} else {
				feature = stop.feature;
			}
			li = document.createElement("li");
			// TODO: place attribute value here instead of generic text.
			li.textContent = stop.name || "STOP ";
			removeLink = document.createElement("a");
			removeLink.href = "#";
			removeLink.classList.add("remove-link");
			removeLink.textContent = "remove";
			li.appendChild(removeLink);
			li.setAttribute("data-graphic", JSON.stringify(stop));
			removeLink.onclick = removeItemFromList;
		}
		return li;
	}

	/*
	 * @property {HTMLFormElement} form
	 * @property {Object} properties
	 * @property {Object.<string, RestrictionInfo>} descriptions
	 */
	var ArcGisRouteUI = declare([Evented], {
		form: null,
		properties: null,
		descriptions: null,
		stopList: null,
		/**
		 * @param {esri/Graphic} stop
		 */
		addStop: function (stop) {
			var li;
			if (!stop) {
				throw new TypeError("No stop was provided.");
			} else if (stop.feature) {
				li = createStopListItem(stop);
				this.stopList.appendChild(li);
			}
		},
		/**
		 * @param {boolean} async - Set to true for async routing service, false for sync.
		 * @constructs
		 */
		constructor: function (async) {
			var self = this, form, properties, descriptions;

			function onFormSubmit() {
				////var event = new CustomEvent("route-params-submit", {
				////	detail: "Submitted route parameters go here"
				////});
				////self.form.dispatchEvent(event);

				self.emit("route-params-submit", { detail: "Submitted route parameters go here" });

				return false;
			}

			if (async) {
				properties = parseTabSeparatedData(asyncValues);
				descriptions = parseDescriptions(asyncDescriptions);
			} else {
				properties = parseTabSeparatedData(syncValues);
				descriptions = parseDescriptions(syncDescriptions);
			}
			form = createFormFromObjectProperties(properties);
			form.onsubmit = onFormSubmit;
			this.form = form;
			this.stopList = form.querySelector(".stop-list");
			this.properties = properties;
			this.descriptions = descriptions;
		}
	});



	return ArcGisRouteUI;
});