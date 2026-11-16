// Копилка инструментов для управляющего магазином

var zones = [];          // все зоны (KPI) из базы
var tools = [];          // все инструменты из базы
var selectedZones = [];  // id зон, которые отметил управляющий
var plan = [];           // id инструментов, которые лежат в плане

// Элементы страницы
var loadBox = document.getElementById("loadBox");
var fileInput = document.getElementById("fileInput");
var loadError = document.getElementById("loadError");
var page = document.getElementById("page");
var zonesBox = document.getElementById("zones");
var resultsBox = document.getElementById("results");
var planBox = document.getElementById("plan");
var planEmpty = document.getElementById("planEmpty");
var planList = document.getElementById("planList");
var planMessage = document.getElementById("planMessage");
var copyBtn = document.getElementById("copyBtn");
var excelBtn = document.getElementById("excelBtn");
var printBtn = document.getElementById("printBtn");
var clearBtn = document.getElementById("clearBtn");


// ---------- Загрузка базы инструментов ----------

function loadData() {
    fetch("data/tools.json")
        .then(function (response) {
            return response.json();
        })
        .then(function (data) {
            startApp(data);
        })
        .catch(function () {
            // Если страницу открыли просто как файл, браузер не даёт прочитать JSON.
            // Тогда просим выбрать файл вручную.
            loadBox.hidden = false;
        });
}

// Ручная загрузка файла tools.json
fileInput.addEventListener("change", function () {
    var file = fileInput.files[0];
    if (!file) {
        return;
    }

    var reader = new FileReader();
    reader.onload = function () {
        try {
            var data = JSON.parse(reader.result);
            startApp(data);
        } catch (error) {
            loadError.textContent = "Не получилось прочитать файл. Проверьте, что это tools.json и в нём нет ошибок.";
        }
    };
    reader.readAsText(file);
});

function startApp(data) {
    zones = data.zones;
    tools = data.tools;

    loadBox.hidden = true;
    page.hidden = false;

    showZones();
    showResults();
    showPlan();
}


// ---------- Вспомогательные функции ----------

// Поиск инструмента по id
function findTool(id) {
    for (var i = 0; i < tools.length; i++) {
        if (tools[i].id == id) {
            return tools[i];
        }
    }
    return null;
}

// Название зоны по её id
function getZoneName(zoneId) {
    for (var i = 0; i < zones.length; i++) {
        if (zones[i].id == zoneId) {
            return zones[i].name;
        }
    }
    return zoneId;
}

// Все зоны инструмента одной строкой
function getZonesText(tool) {
    var names = [];
    for (var i = 0; i < tool.zones.length; i++) {
        names.push(getZoneName(tool.zones[i]));
    }
    return names.join(", ");
}

function getSpeedText(tool) {
    if (tool.speed == "fast") {
        return "результат в первую неделю";
    }
    return "результат через время";
}

// Сортировка: сначала быстрые инструменты, потом долгие
function sortBySpeed(list) {
    var fast = [];
    var long = [];
    for (var i = 0; i < list.length; i++) {
        if (list[i].speed == "fast") {
            fast.push(list[i]);
        } else {
            long.push(list[i]);
        }
    }
    return fast.concat(long);
}

function makeBadge(tool) {
    var badge = document.createElement("span");
    badge.className = "badge badge-" + tool.speed;
    badge.textContent = getSpeedText(tool);
    return badge;
}


// ---------- Шаг 1. Зоны ----------

function showZones() {
    zonesBox.innerHTML = "";

    for (var i = 0; i < zones.length; i++) {
        var label = document.createElement("label");
        label.className = "zone";

        var checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = zones[i].id;
        checkbox.addEventListener("change", changeZones);

        var text = document.createElement("span");
        text.textContent = zones[i].name;

        label.appendChild(checkbox);
        label.appendChild(text);
        zonesBox.appendChild(label);
    }
}

// Собираем заново список отмеченных зон
function changeZones() {
    selectedZones = [];
    var checkboxes = zonesBox.querySelectorAll("input");

    for (var i = 0; i < checkboxes.length; i++) {
        if (checkboxes[i].checked) {
            selectedZones.push(checkboxes[i].value);
        }
    }

    showResults();
}


// ---------- Шаг 2. Инструменты из копилки ----------

function showResults() {
    resultsBox.innerHTML = "";

    if (selectedZones.length == 0) {
        var empty = document.createElement("p");
        empty.className = "results-empty";
        empty.textContent = "Копилка пока закрыта. Отметьте хотя бы одну зону выше.";
        resultsBox.appendChild(empty);
        return;
    }

    for (var i = 0; i < zones.length; i++) {
        var zone = zones[i];

        if (selectedZones.indexOf(zone.id) == -1) {
            continue;
        }

        // Ищем инструменты, которые подходят для этой зоны
        var zoneTools = [];
        for (var j = 0; j < tools.length; j++) {
            if (tools[j].zones.indexOf(zone.id) != -1) {
                zoneTools.push(tools[j]);
            }
        }
        zoneTools = sortBySpeed(zoneTools);

        var group = document.createElement("div");
        group.className = "group";

        var title = document.createElement("h3");
        title.className = "group-title";
        title.textContent = zone.title + " ";

        var count = document.createElement("span");
        count.className = "group-count";
        count.textContent = "(" + zoneTools.length + ")";
        title.appendChild(count);

        group.appendChild(title);

        for (var k = 0; k < zoneTools.length; k++) {
            group.appendChild(makeToolCard(zoneTools[k]));
        }

        resultsBox.appendChild(group);
    }

    markToolsInPlan();
}

// Карточка одного инструмента
function makeToolCard(tool) {
    var card = document.createElement("div");
    card.className = "tool";
    card.draggable = true;
    card.tabIndex = 0;
    card.setAttribute("data-id", tool.id);

    var top = document.createElement("div");
    top.className = "tool-top";

    var name = document.createElement("span");
    name.className = "tool-name";
    name.textContent = tool.name;

    var addBtn = document.createElement("button");
    addBtn.className = "tool-add";
    addBtn.type = "button";
    addBtn.textContent = "+";
    addBtn.title = "Добавить в план";

    top.appendChild(name);
    top.appendChild(makeBadge(tool));
    top.appendChild(addBtn);

    // Подсказка, сначала скрыта
    var hint = document.createElement("div");
    hint.className = "hint";
    hint.hidden = true;

    var p1 = document.createElement("p");
    p1.innerHTML = "<b>Что это:</b> ";
    p1.appendChild(document.createTextNode(tool.description));

    var p2 = document.createElement("p");
    p2.innerHTML = "<b>Как работать:</b> ";
    p2.appendChild(document.createTextNode(tool.howTo));

    var p3 = document.createElement("p");
    p3.innerHTML = "<b>Подходит для:</b> ";
    p3.appendChild(document.createTextNode(getZonesText(tool)));

    hint.appendChild(p1);
    hint.appendChild(p2);
    hint.appendChild(p3);

    card.appendChild(top);
    card.appendChild(hint);

    // Нажатие на инструмент открывает и закрывает подсказку
    top.addEventListener("click", function () {
        hint.hidden = !hint.hidden;
    });

    card.addEventListener("keydown", function (event) {
        if (event.key == "Enter" && event.target == card) {
            hint.hidden = !hint.hidden;
        }
    });

    // Кнопка "+" для тех, кому неудобно перетаскивать (например, с телефона)
    addBtn.addEventListener("click", function (event) {
        event.stopPropagation();
        addToPlan(tool.id);
    });

    // Начало перетаскивания: запоминаем id инструмента
    card.addEventListener("dragstart", function (event) {
        event.dataTransfer.setData("text/plain", tool.id);
    });

    return card;
}

// Делаем бледными инструменты, которые уже есть в плане
function markToolsInPlan() {
    var cards = resultsBox.querySelectorAll(".tool");

    for (var i = 0; i < cards.length; i++) {
        var id = Number(cards[i].getAttribute("data-id"));

        if (plan.indexOf(id) != -1) {
            cards[i].classList.add("tool-in-plan");
        } else {
            cards[i].classList.remove("tool-in-plan");
        }
    }
}


// ---------- Шаг 3. Мой план ----------

function addToPlan(id) {
    id = Number(id);

    if (findTool(id) == null) {
        return;
    }

    if (plan.indexOf(id) != -1) {
        showMessage("Этот инструмент уже в плане");
        return;
    }

    plan.push(id);
    showPlan();
    markToolsInPlan();
}

function removeFromPlan(id) {
    var index = plan.indexOf(id);
    if (index != -1) {
        plan.splice(index, 1);
    }
    showPlan();
    markToolsInPlan();
}

// Инструменты плана, отсортированные от быстрых к долгим
function getPlanTools() {
    var list = [];
    for (var i = 0; i < plan.length; i++) {
        list.push(findTool(plan[i]));
    }
    return sortBySpeed(list);
}

function showPlan() {
    planList.innerHTML = "";

    var list = getPlanTools();

    for (var i = 0; i < list.length; i++) {
        planList.appendChild(makePlanItem(list[i]));
    }

    var isEmpty = list.length == 0;
    planEmpty.hidden = !isEmpty;
    copyBtn.disabled = isEmpty;
    excelBtn.disabled = isEmpty;
    printBtn.disabled = isEmpty;
    clearBtn.disabled = isEmpty;
}

function makePlanItem(tool) {
    var item = document.createElement("li");
    item.className = "plan-item";

    var name = document.createElement("p");
    name.className = "plan-name";
    name.textContent = tool.name;

    var zonesText = document.createElement("p");
    zonesText.className = "plan-zones";
    zonesText.textContent = "Для чего: " + getZonesText(tool);

    // Эти два абзаца видны только при печати
    var description = document.createElement("p");
    description.className = "plan-details";
    description.textContent = "Что это: " + tool.description;

    var howTo = document.createElement("p");
    howTo.className = "plan-details";
    howTo.textContent = "Как работать: " + tool.howTo;

    var removeBtn = document.createElement("button");
    removeBtn.className = "plan-remove no-print";
    removeBtn.type = "button";
    removeBtn.textContent = "×";
    removeBtn.title = "Убрать из плана";
    removeBtn.addEventListener("click", function () {
        removeFromPlan(tool.id);
    });

    item.appendChild(name);
    item.appendChild(makeBadge(tool));
    item.appendChild(zonesText);
    item.appendChild(description);
    item.appendChild(howTo);
    item.appendChild(removeBtn);

    return item;
}

// Перетаскивание в область плана
planBox.addEventListener("dragover", function (event) {
    event.preventDefault(); // без этого браузер не разрешит бросить элемент
    planBox.classList.add("plan-over");
});

planBox.addEventListener("dragleave", function () {
    planBox.classList.remove("plan-over");
});

planBox.addEventListener("drop", function (event) {
    event.preventDefault();
    planBox.classList.remove("plan-over");

    var id = event.dataTransfer.getData("text/plain");
    addToPlan(id);
});

// Короткое сообщение под кнопками, само пропадает через 3 секунды
function showMessage(text) {
    planMessage.textContent = text;
    setTimeout(function () {
        if (planMessage.textContent == text) {
            planMessage.textContent = "";
        }
    }, 3000);
}


// ---------- Кнопки плана ----------

// Скопировать в буфер обмена
copyBtn.addEventListener("click", function () {
    var list = getPlanTools();
    var text = "Мой план\n\n";

    for (var i = 0; i < list.length; i++) {
        text += (i + 1) + ". " + list[i].name + " (" + getSpeedText(list[i]) + ")\n";
        text += "   Для чего: " + getZonesText(list[i]) + "\n";
        text += "   Как работать: " + list[i].howTo + "\n\n";
    }

    if (navigator.clipboard) {
        navigator.clipboard.writeText(text)
            .then(function () {
                showMessage("Скопировано в буфер обмена");
            })
            .catch(function () {
                copyOldWay(text);
            });
    } else {
        copyOldWay(text);
    }
});

// Запасной способ копирования для старых браузеров
function copyOldWay(text) {
    var area = document.createElement("textarea");
    area.value = text;
    document.body.appendChild(area);
    area.select();

    var ok = document.execCommand("copy");
    document.body.removeChild(area);

    if (ok) {
        showMessage("Скопировано в буфер обмена");
    } else {
        showMessage("Не получилось скопировать");
    }
}

// Заменяем символы, которые могут сломать таблицу
function safeText(text) {
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

// Сохранить как файл Excel.
// Excel умеет открывать обычную HTML-таблицу, сохранённую с расширением .xls
excelBtn.addEventListener("click", function () {
    var list = getPlanTools();

    var table = "<table border='1'>";
    table += "<tr>";
    table += "<th>№</th>";
    table += "<th>Инструмент</th>";
    table += "<th>Для каких зон</th>";
    table += "<th>Скорость результата</th>";
    table += "<th>Описание</th>";
    table += "<th>Как работать</th>";
    table += "</tr>";

    for (var i = 0; i < list.length; i++) {
        table += "<tr>";
        table += "<td>" + (i + 1) + "</td>";
        table += "<td>" + safeText(list[i].name) + "</td>";
        table += "<td>" + safeText(getZonesText(list[i])) + "</td>";
        table += "<td>" + getSpeedText(list[i]) + "</td>";
        table += "<td>" + safeText(list[i].description) + "</td>";
        table += "<td>" + safeText(list[i].howTo) + "</td>";
        table += "</tr>";
    }

    table += "</table>";

    var html = "<html><head><meta charset='UTF-8'></head><body>" + table + "</body></html>";

    // "﻿" нужен, чтобы Excel правильно показал русские буквы
    var blob = new Blob(["﻿" + html], { type: "application/vnd.ms-excel" });
    var url = URL.createObjectURL(blob);

    var link = document.createElement("a");
    link.href = url;
    link.download = "plan-instrumentov.xls";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showMessage("Файл сохранён");
});

// Распечатать (то же самое, что Ctrl+P)
printBtn.addEventListener("click", function () {
    window.print();
});

clearBtn.addEventListener("click", function () {
    plan = [];
    showPlan();
    markToolsInPlan();
});


// Запуск
loadData();
