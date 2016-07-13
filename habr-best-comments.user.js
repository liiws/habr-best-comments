// ==UserScript==
// @name        habr-best-comments
// @namespace   http://habrahabr.ru
// @include     http://habrahabr.ru/post/*
// @include     http://habrahabr.ru/company/*
// @include     http://habrahabr.ru/article/*
// @include     http://geektimes.ru/post/*
// @include     http://geektimes.ru/company/*
// @include     http://geektimes.ru/article/*
// @include     https://habrahabr.ru/post/*
// @include     https://habrahabr.ru/company/*
// @include     https://habrahabr.ru/article/*
// @include     https://geektimes.ru/post/*
// @include     https://geektimes.ru/company/*
// @include     https://geektimes.ru/article/*
// @grant       none
// @run-at      document-start
// @version     0.2.2
// @downloadURL https://bitbucket.org/liiws/habr-best-comments/downloads/habr-best-comments.user.js
// @updateURL   https://bitbucket.org/liiws/habr-best-comments/downloads/habr-best-comments.meta.js
// ==/UserScript==


// fix blocked broken ads
(function(){
	var wnd = typeof unsafeWindow == "undefined" ? window : unsafeWindow;
	if (typeof wnd.adriver == "undefined") {
		wnd.adriver = function () { };
	}
})();


window.addEventListener('load', function () {
	// options
	var _fgAuthor = '#F76D59';
	var _bgAuthor = '#FFAA9D';
	var _fgPositiveMark = '#339900';
	var _fgNegativeMark = '#CC0000';
	var _bgColor = '#F8F8F8';
	var _bgColorNew = '#E8E8FF';
	var _bgColorSelected = '#3D438D';


	var authorElement = $(".post-type__value.post-type__value_author");
	if (authorElement.length == 0) {
		authorElement = $(".author-info__name:last");
	}
	if (authorElement.length == 0) {
		authorElement = $(".author-info__nickname:last");
	}
	var authorName = authorElement.length == 0 ? "" : authorElement.attr("href").split("/").pop();
	
	ShowCommentsPanel();


	// update button
	$('a.refresh').click(function () {
		$('.hbc').remove();
		setTimeout(function () {
			WaitForCommentsWillBeLoadedAndUpdateComments();
		}, 500);

		function WaitForCommentsWillBeLoadedAndUpdateComments() {
			if ($('a.refresh').hasClass('loading')) {
				// wait till update end
				setTimeout(WaitForCommentsWillBeLoadedAndUpdateComments, 100);
			}
			else {
				// update comments
				ShowCommentsPanel();
			}
		}
	});



	function ShowCommentsPanel() {
		var allComments = GetAllComments();
		ShowComments(allComments);
	}

	function GetAllComments() {
		var allComments = [];
		$('.comment_item').each(function (index, item) {
			var id = $(item).attr('id');
			var markItemWrapper = $('> .comment_body > .info > .js-voting > .js-mark', item);
			var markItem = $('> .js-score', markItemWrapper);
			var markTitle = markItem.attr('title');
			var plus = 0;
			var minus = 0;
			if (markTitle && markTitle.length > 0) {
				plus = +markTitle.match(/↑(\d+)/)[1];
				minus = +markTitle.match(/↓(\d+)/)[1];
			}
			var isNew = $('> .comment_body > .info', item).hasClass('is_new');
			var userName = $.trim($('> .comment_body > .info .comment-item__username', item).text());
			var mark = parseInt(markItem.text().match(/\d+/));
			if (markItemWrapper.hasClass('voting-wjt__counter_negative'))
				mark = -mark;
			var hasImg = $('> .comment_body > .message', item).find('img').length > 0;

			allComments.push(
			{
				id: id,
				mark: mark,
				isNew: isNew,
				isAuthor: userName == authorName,
				hasImg: hasImg,
				plus: plus,
				minus: minus,
				markItemWrapper: markItemWrapper
			});
		});


		// remove comments without mark
		allComments = allComments.reduce(function (prev, cur) {
			if (!isNaN(cur.mark)) {
				prev.push(cur);
			}
			return prev;
		}, []);

		// best desc, time asc		
		allComments.sort(function (a, b) {
			return a.mark == b.mark
				? (a.id < b.id ? 1 : -1)
				: ((isNaN(a.mark) ? 0 : a.mark) > (isNaN(b.mark) ? 0 : b.mark) ? 1 : -1)
		});
		allComments.reverse();

		return allComments;
	}


	function ShowComments(comments) {
		var wnd = $('<div class="hbc" style="width: 70px; top: 55px; bottom: 10px; right: 32px; overflow: auto; position: fixed; z-index: 2;"></div>');
		$(wnd).css('background-color', _bgColor);
		$('body').append(wnd);
		$.each(comments, function (index, comment) {
			
			// right panel
			
			// create item
			var item = $('<div class="hbc__item" style="text-align: right;"><a href="#">0</a></div>');
			$('a', item).attr('href', '#' + comment.id);
			$('a', item).text(isNaN(comment.mark) ? '?' : (comment.mark >= 0 ? '+' + comment.mark : comment.mark));

			// mark color
			if (comment.mark >= 0)
				$('a', item).css('color', _fgPositiveMark);
			else
				$('a', item).css('color', _fgNegativeMark);

			if (comment.isAuthor) {
				$('a', item).before('<span style="color: ' + _fgAuthor + '; font-weight: bold;">A </span>');
			}
			if (comment.hasImg) {
				$('a', item).before('<span style="color: blue; font-weight: bold;">i </span>');
			}

			// bg color
			if (comment.isNew) {
				$(item).addClass('hbc__item-when-new');
				$(item).css('background-color', _bgColorNew);
			}

			// onclick event
			$(item).bind('click', Comment_OnClick);

			// add item
			$(wnd).append(item);
			
			
			// add plus/minus to the comment mark
			
			if (comment.plus > 0 && comment.minus > 0) {
				var markItemWrapper = comment.markItemWrapper;
				markItemWrapper.find('.hbc__mark-add').remove();
				item = $('<div class="hbc__mark-add" style="font-weight: bold; line-height: 6px; opacity: 0.4;"><span style="color: ' + _fgPositiveMark + ';">+' + comment.plus + '</span> <span style="color: ' + _fgNegativeMark + ';">-' + comment.minus + '</span></div>');				
				markItemWrapper.append(item);
			}
			
		});

		// highlight author name
		$('a.comment-item__username:contains("' + authorName + '")').css('background-color', _bgAuthor);
	}

	function Comment_OnClick() {
		$('.hbc__item').css('background-color', _bgColor);
		$('.hbc__item-when-new').css('background-color', _bgColorNew);
		$(this).css('background-color', _bgColorSelected);
		// go to url before browser "A" to emulate click at "A" to times. Habr has bug - click on "A" first time after page opening goes to wrong comment.
		document.location = $(this).find('a').attr('href');
	}
});