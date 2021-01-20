'use strict';

// TODO Реализовать вывод кода ошибки если что-то упадет
// TODO Реализовать адаптив

/**
 *
 * Виджет "Хранитель"
 *
 * @version 0.6
 * @author sashafdtv
 *
 */

/**
 * Данные виджета
 */
const data = {
	/**
	 * Хранит предыдущий id аккаунта
	 * @type {number}
	 */
	tempAccountID: null,

	/**
	 * Список тикетов
	 * @type {Array}
	 */
	ticketsList: [],

	/**
	 * Установлена ли связь с сервером
	 * @type {boolean}
	 */
	connectOk: false,

	/**
	 * Текущий код ngrok для совершения запросов на сервер
	 * @type {number}
	 */
	ngrokCode: null,
};

/**
 * Вернул FIXME добавить описание
 */

const getID = () => {
	let idTextarea = $(`textarea[id="person_n"]`).html().split(': ')[1];
	let idInput = $(`input[name="CFV[1276677]"]`)[0].value;

	return idInput || idTextarea;
};

/**
 * @function checkChangeID
 * @callback checkNgrok
 * @return {number}
 *
 * Функция получает id текущего чата и сравнивает его с id предыдущего чата.
 * Если id не совпадают, вызывает функцию checkNgrok(),
 * тем самым инициализируя перерисовку виджета.
 *
 */

const ckechChangeID = () => {
	let accountID = getID();

	if (accountID) {
		if (accountID !== data.tempAccountID) {
			data.tempAccountID = accountID;
			checkNgrok();
		}
	} else {
		data.accountID = accountID;
		data.tempAccountID = accountID;
		checkNgrok();
	}

	return accountID;
};

/**
 * @function checkNgrok
 * @callback getTicketData
 * @callback render
 *
 * Функция отправляет check запрос на сервер, проверяя его работоспособность.
 * Устанавливает значение глобальной переменной connectOk в зависимости от ответа сервера.
 * Вызывает функцию getTicketData если сервер ответил.
 * Вызывает функцию render() независимо от ответа сервера.
 *
 */

const checkNgrok = () => {
	// Получаем код ngrok из chrome storage
	chrome.storage.sync.get(['ngrokCode'], (result) => {
		data.ngrokCode = result.ngrokCode;

		$.ajax({
			url: `https://${data.ngrokCode}.ngrok.io/connect/check`,
			type: 'GET',
		})

			.done(() => {
				data.connectOk = true;
				getTicketData().then(() => {
					render();
				});
			})

			.error(() => {
				render();
				data.connectOk = false;
			});
	});
};

/**
 * @async
 * @function getTicketData
 *
 * Функция получает список тикетов с сервера и записывает их в глобльную
 * переменную ticketList.
 *
 */

const getTicketData = async () => {
	// Получаем account ID
	let accountID = ckechChangeID();

	// Храним account ID в tempAccountID для последующего сравнения
	data.tempAccountID = accountID;

	if (data.connectOk) {
		try {
			await $.getJSON(
				`https://` + data.ngrokCode + `.ngrok.io/ticket/get/` + ckechChangeID(),
				function (tickets) {
					if (tickets) {
						tickets.forEach((ticket) => {
							data.ticketsList.push({
								name: ticket.name,
								link: ticket.link,
								status: ticket.status,
								code: ticket.code,
								count: ticket.count,
							});
						});
					}
				}
			);
		} catch {
			console.log('Нет активных тикетов для чата');
		}
	}
};

/**
 * @function render
 * @callback addTicketItems
 * @callback addExpansionEvent
 * @callback addTicketEvent
 *
 * Функция рендера виджета
 *
 */

const render = async () => {
	// Удаляем виджет, если он уже отрисован
	$('.ticket-expansion').remove();

	// Получаем DOM списка виджетов
	let $widgetList = $('.js-card-widgets-on');

	// Если виджет уже отрисован
	if (document.querySelector('.ticket-expansion')) {
		$('.ticket-expansion_list li').remove();
		addTicketItems(data.ticketsList);
		return;
	}

	// Получаем верстку расширения из template.hmtl
	$.get(chrome.extension.getURL('template/template.html'), function (template) {
		// Добавляем виджет на страницу
		$(template).appendTo($widgetList);

		// Дабавляем тикеты
		if (data.connectOk && data.ticketsList.length !== 0) {
			addTicketItems(data.ticketsList);
		}

		const JT = {
			$expansion: document.querySelector('.ticket-expansion'),
			$items: $('.ticket-expansion-item'),
			$valudation: $('.ticket-expansion-validate'),

			$header: $('.ticket-expansion_header'),
			$arrow: document.querySelector('.ticket-expansion_arrow'),

			$addControls: $('.ticket-controls'),
			$ngrokInputs: $('.ticket-ngrok .ticket-expansion-inputs'),

			$hideInputButton: $('.ticket-expansion_addTicket-changeVisible'),

			$plug: $('.ticket-expansion-plug'),

			$prevTicketControls: null,

			isShow: false,
		};

		addExpansionEvent(JT);

		if (data.connectOk) {
			$('.ticket-button').on('click', addTicket);

			// Если у аккаунта нет тикетов, показываем заглушку
			if (data.ticketsList.length == 0) {
				JT.$plug.css('display', 'block');
			} else {
				// Если у аккаунта есть тикеты, раскрываем расширение
				JT.$header.click();
			}

			// Добавляем события для тикетов
			JT.$items.each(function () {
				let ticket = this;
				addTicketEvent(ticket, JT);
			});
		} else {
			// Если связи с сервером ngrok нет, показываем форму ввода ngrok кода
			JT.$ngrokInputs.css('display', 'flex');
			JT.$ngrokInputs.css('height', 'auto');
			JT.$addControls.css('display', 'none');
			JT.$header.click();
		}
	});
};

/**
 * @function addTicketItems
 * @param {Array} ticketsList
 * @callback getTicketHTML
 *
 * Функция добавления тикетов из массива, полученного с сервера в верстку.
 *
 */

const addTicketItems = (ticketsList) => {
	ticketsList.forEach((ticket) => {
		let $ticketsListDOM =
			ticket.status === 'К выполнению'
				? '.ticket-expansion_list.active'
				: '.ticket-expansion_list.complite';

		let ticketHTML = getTicketHTML(
			ticket.name,
			ticket.link,
			ticket.count,
			ticket.code,
			ticket.status
		);

		$(ticketHTML).appendTo($($ticketsListDOM));
	});
};

/**
 * @function getTicketHTML
 * @param {string} name
 * @param {string} link
 * @param {string} count
 * @param {string} code
 * @param {string} status
 *
 * Функция принимает значение определенных полей и формирует из них верстку тикета.
 *
 */

const getTicketHTML = (name, link, count, code, status) => {
	let ticketColor = '';

	switch (true) {
		case count <= 3:
			ticketColor = '#698963';
			break;
		case count <= 5:
			ticketColor = '#D89354';
			break;
		case count > 5:
			ticketColor = '#C95959';
			break;
	}

	if (status !== 'К выполнению') ticketColor = '#fff';

	return `<li class="ticket-expansion-item" style="background-color: ${ticketColor}">
    <div class="ticket-expansion_content" " >

        <div class="ticket-expansion_count">${count}x</div>

    <div class="ticket-expansion_textContent">
        <p>${name}</p>
        <p>
            <a href="${link}" onclick="event.stopPropagation()" target="_blank">${code}</a>
        </p>
        <p>Вернуть тикет</p>
        </div>


    </div>
    <div class="ticket-expansion_controls">
        <div class="ticket-expansion__done"></div>
        <div class="ticket-expansion__delite"></div>
    </div>
</li>`;
};

/**
 * @function addExpansionEvent
 * @param {Object} JT
 *
 * Функция добавляет события на тело расширение.
 * Добавляет следующие события на расширение:
 *
 * 		1. Скрытие и показ расширения по клику по header
 *
 * 		2. Скрытие и показ контролов для добавление тикета
 * 		   @callback addTicket
 *
 * 		3. События для формы ввода ngrok кода
 * 		   @callback checkNgrok
 *
 */

const addExpansionEvent = (JT) => {
	let $inputsBlock = JT.$addControls.find('.ticket-expansion-inputs');

	// 1. Вешаем события на раскрытие расширения
	JT.$header.on('click', () => {
		JT.isShow = !JT.isShow;

		JT.$expansion.style.height = JT.isShow ? 'auto' : '41.8px';

		JT.$arrow.style.transform = JT.isShow ? 'rotate(0deg)' : 'rotate(180deg)';
	});

	// 2. Добавление событий для контролов добавления тикета
	JT.$hideInputButton.on('click', () => {
		// Скрываем сообщение об ошибке валидации если оно было показано
		JT.$valudation.css('display', 'none');

		if ($inputsBlock.css('height') === '0px') {
			$inputsBlock.css('height', '153px');

			// Стилизация крестика
			$('.line:nth-child(2)').css('transform', 'rotate(0deg)');
		} else {
			$inputsBlock.css('height', '0px');

			// Стилизация крестика
			$('.line:nth-child(2)').css('transform', 'rotate(90deg)');
		}
	});

	$inputsBlock.children('button').on('click', () => {
		addTicket();
	});

	// 3. Добавление событий для блока ввода ngrok кода
	$('.ticket-expansion-inputs .ngrok-button').on('click', () => {
		let ngrokLink = $('.storage').val();
		chrome.storage.sync.set(
			{
				ngrokCode: ngrokLink,
			},
			function () {
				checkNgrok();
			}
		);
	});
};

/**
 * @function addTicketEvent
 * @param {Object} ticket
 * @param {Object} JT
 *
 * Функция добавляет события на тикет.
 * Добавляет следующие события:
 *
 * 		1. Скрытие и раскрытие контролов тикета
 *
 * 		2. Событие добавления тикета
 * 		   @callback addTicketEvent
 *
 * 		3. Удаление тикета
 *
 * 		4. Возврат тикета в список активных
 * 		   @callback addTicketEvent
 * 		   @callback setColor
 *
 */

const addTicketEvent = (ticket, JT) => {
	let $ticketControls = $(ticket).children('.ticket-expansion_controls');

	// 1. Скрытие и раскрытие контролов
	$(ticket).on('click', (event) => {
		// Скрываем контролы предыдущего выбранного тикета
		if (JT.$prevTicketControls) {
			JT.$prevTicketControls.css('height', '0px');
		}

		$ticketControls.css('height') === '0px'
			? $ticketControls.css('height', '30px')
			: $ticketControls.css('height', '0px');

		JT.$prevTicketControls = $ticketControls;
	});

	// 2. Завершение тикета
	$(ticket)
		.find('.ticket-expansion__done')
		.on('click', () => {
			$ticketControls.css('height', '0px');

			$('.ticket-expansion_list.complite').append(`<li>${$(ticket).html()}</li>`);

			let $newTicket = $('.ticket-expansion_list.complite li:last-child');

			addTicketEvent($newTicket);

			$(ticket).remove();

			let ticketCode = $(ticket).find('.ticket-expansion_textContent a').html();

			$.ajax({
				url: `https://${data.ngrokCode}.ngrok.io/ticket/change/status/${ticketCode}`,
				type: 'POST',
				data: JSON.stringify({
					status: 'Принято',
				}),
			});
		});

	// 3. Удаление тикета
	$(ticket)
		.find('.ticket-expansion__delite')
		.on('click', () => {
			$(ticket).remove();

			let code = $(ticket).find('.ticket-expansion_textContent a').html();

			if (data.ticketsList.length - 1 === 0)
				$('.ticket-expansion-plug').css('display', 'block');

			$.ajax({
				url: `https://${data.ngrokCode}.ngrok.io/ticket/delete/${code}/${checkChangeID()}`,
				type: 'DELETE',
			}).done((res) => {
				data.ticketsList = res ? res : [];
			});
		});

	// 4. Возврат тикета в список активных
	$(ticket)
		.find('.ticket-expansion_textContent p:nth-child(3)')
		.on('click', () => {
			$ticketControls.css('height', '0px');
			$('.ticket-expansion_list.active').append(`<li>${$(ticket).html()}</li>`);

			let newTicket = $('.ticket-expansion_list.active li:last-child');
			addTicketEvent(newTicket);
			setColor(newTicket);

			$(ticket).remove();

			let code = $(ticket).find('.ticket-expansion_textContent a').html();

			$.ajax({
				url: `https://${data.ngrokCode}.ngrok.io/ticket/change/status/${code}`,
				type: 'POST',
				data: JSON.stringify({
					status: 'К выполнению',
				}),
			});
		});
};

/**
 * @function addTicket
 *
 * @callback getID
 * @callback addTicketEvent
 *
 * Функция добавления тикета.
 *
 */

// Добавление тикета
const addTicket = () => {
	let $ticketName = $('.ticket-input-name');
	let $ticketLink = $('.ticket-input-link');
	let $ticketValidate = $('.ticket-expansion-validate');
	let accountId = getID();

	$ticketValidate.css('display', 'none');

	let ticketData = {
		name: $ticketName.val(),
		link: $ticketLink.val(),
		status: 'К выполнению',
		account_id: +accountId,
	};

	// Валидация кода тикета
	let ticketCode = $ticketLink.val().split('/');
	ticketCode = ticketCode[ticketCode.length - 1];

	if (data.ticketsList) {
		if (data.ticketsList.map((ticket) => ticket.code).find((code) => code == ticketCode)) {
			$('.ticket-expansion-validate').css('display', 'block');
			return;
		}
	}

	$('.ticket-expansion-plug').css('display', 'none');

	$('.ticket-expansion-validate').css('display', 'none');

	$.ajax({
		url: `https://${data.ngrokCode}.ngrok.io/ticket/add`,
		type: 'POST',
		data: JSON.stringify(ticketData),
	}).then((data) => {
		let ticket = data[data.length - 1];

		let ticketHTML = getTicketHTML(
			ticket.name,
			ticket.link,
			ticket.count,
			ticket.code,
			ticket.status
		);

		data.ticketsList.push({
			name: ticket.name,
			link: ticket.link,
			status: ticket.status,
			code: ticket.code,
			count: ticket.count,
		});

		$('.ticket-expansion_list.active').append(ticketHTML);
		addTicketEvent($('.ticket-expansion_list.active li:last-child'));

		$ticketName.val('');
		$ticketLink.val('');
	});
};

/**
 * Исполняющий код: вызов функции checkNgrok с определенным интервалом
 * (принцип украден с виджета по проверке аккаунта)
 */

setInterval(ckechChangeID, 4000);
