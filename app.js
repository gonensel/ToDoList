const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");

const app = express();

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
mongoose.set("strictQuery", true);



mongoose.connect("mongodb://localhost:27017/todoListDB", {
	useNewUrlParser: true,
});

const itemsSchema = {
	name: String,
};
const Item = mongoose.model("Item", itemsSchema);

const item1 = new Item({
	name: "Welcome to your todolist!",
});

const item2 = new Item({
	name: "Hit the + button to add a new item.",
});

const item3 = new Item({
	name: "Hit this to delete an item. -->",
});

const item4 = new Item({
	name: "To edit an item just click on it",
});

const defaultItems = [item1, item2, item3, item4];

const listSchema = {
	name: String,
	items: [itemsSchema],
};
let firstTime = true;
const List = mongoose.model("List", listSchema);

app.get("/", (req, res) => {


	Item.find({}, (err, foundItems) => {
		if (foundItems.length === 0 && firstTime) {
			Item.insertMany(defaultItems, (err) => {
				if (err) {
					console.log(err);
				} else {
					console.log("Successfully savevd default items to DB.");
				}
			});
			res.redirect("/");
		} else {
			List.find({}, (err, foundLists) => {
				if (!err) {
					res.render("list", {
						listTitle: "Today",
						newListItems: foundItems,
						lists: foundLists,
					});
				}
			});
		}
		firstTime = false;
	});
});

app.get("/:customListName", (req, res) => {
	const customListName = _.capitalize(req.params.customListName);
	if (customListName === "Favicon.ico") {
		return;
	}

	List.findOne({ name: customListName }, (err, foundList) => {
		if (!err) {
			if (!foundList) {
				//Create a new list
				const list = new List({
					name: customListName,
					items: [],
				});
				list.save();
				res.redirect("/" + customListName);
			} else {
				//Show an existing list

				List.find({}, (err, foundLists) => {
					if (!err) {
						res.render("list", {
							listTitle: foundList.name,
							newListItems: foundList.items,
							lists: foundLists,
						});
					}
				});
			}
		}
	});
});

app.post("/", (req, res) => {


	const itemName = req.body.newItem;
	const listName = req.body.list;

	const item = new Item({
		name: itemName,
	});

	if (listName === "Today") {
		if (itemName.length === 0) {
			res.redirect("/");
			return;
		}
		item.save();
		res.redirect("/");
	} else {
		List.findOne({ name: listName }, function (err, foundList) {
			if (itemName.length === 0) {
				res.redirect("/" + listName);
				return;
			}
			foundList.items.push(item);
			foundList.save();
			res.redirect("/" + listName);
		});
	}
});

app.post("/delete", (req, res) => {
	const checkedItemId = req.body.id;
	const listName = req.body.listName;
	if (listName === "Today") {
		Item.findByIdAndRemove(checkedItemId, (err) => {
			if (!err) {
				console.log("Successfully deleted checked item.");
				res.redirect("/");
			}
		});
	} else {
		List.findOneAndUpdate(
			{ name: listName },
			{ $pull: { items: { _id: checkedItemId } } },
			function (err, foundList) {
				if (!err) {
					res.redirect("/" + listName);
				}
			}
		);
	}
});

app.post("/update", (req, res) => {


	const checkedItemId = req.body.id;
	const listName = req.body.listName;
	let newName = req.body.itemName;
	const oldName = req.body.oldName;

	if (newName.length === 0) {
		newName = oldName;
	}
	if (listName === "Today") {
		Item.findByIdAndUpdate(
			checkedItemId,
			{
				name: newName,
			},
			function (err) {
				if (!err) {
					console.log("Successfully update checked item.");
					res.redirect("/");
				}
			}
		);
	} else {
		//for update item in the list
		List.findOneAndUpdate(
			{ name: listName, "items._id": checkedItemId },
			{
				$set: {
					"items.$.name": newName,
				},
			},
			(err) => {
				if (!err) res.redirect("/" + listName);
			}
		);
	}
});

app.post("/addList", (req, res) => {

	const add = _.capitalize(req.body.addListInput);
	const currList = req.body.CurrListName;
	if (add.length === 0) {
		if (currList === "Today") {
			res.redirect("/");
		} else {
			console.log("in /addList");

			res.redirect("/" + currList);
		}
	} else {
		List.findOne({ name: add }, (err, foundList) => {
			if (err) console.log(err);
			else {
				res.redirect("/" + add);
			}
		});
	}
});

app.post("/deleteAll", (req, res) => {
	const listName = req.body.listName;
	if (listName === "Today") {
		Item.deleteMany({}, (err) => {
			if (!err) {
				console.log("Successfully delete all items");
				res.redirect("/");
			}
		});
	} else {
		List.findOneAndUpdate(
			{ name: listName},
			{
				$set: {
					items: [],
				},
			},
			(err) => {
				if (!err) res.redirect("/" + listName);
			}
		);
	}
});

app.listen(3000, function () {
	console.log("Server started on port 3000");
});
