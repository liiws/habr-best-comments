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
// @version     0.3.5
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
	var _highlightIntervalMs = 5400;
	var _scrollTopOffsetPc = 0.2;
	var _fgImage = '#0000FF';
	var _fgLink = '#366804';


	var authorElement = $(".post__user-info.user-info");
	var authorLogin = authorElement.length == 0 ? "" : authorElement.attr("href").split("/").filter(x => x != "").pop();
	
	ShowCommentsPanel();


	// update button
	$('span.refresh').click(function () {
		$('.hbc').remove();
		setTimeout(function () {
			WaitForCommentsWillBeLoadedAndUpdateComments();
		}, 500);

		function WaitForCommentsWillBeLoadedAndUpdateComments() {
			if ($('span.refresh').hasClass('loading')) {
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
		$('.comment').each(function (index, item) {
			var id = $(item).attr('id');
			var markItemWrapper = $('> .comment__head > .js-comment-vote', item);
			var markItem = $('> .js-score', markItemWrapper);
			var markTitle = markItem.attr('title');
			var plus = 0;
			var minus = 0;
			if (markTitle && markTitle.length > 0) {
				plus = +markTitle.match(/↑(\d+)/)[1];
				minus = +markTitle.match(/↓(\d+)/)[1];
			}
			var isNew = $('> .comment__head', item).hasClass('comment__head_new-comment');
			var userLogin = $.trim($('> .comment__head > .user-info', item).attr("href").split("/").filter(x => x != "").pop());
			var mark = parseInt(markItem.text().match(/\d+/));
			if (markItem.hasClass('voting-wjt__counter_negative'))
				mark = -mark;
			var hasImg = $('> .comment__message', item).find('img').length > 0;
			var hasLink = $('> .comment__message', item).find('a').length > 0;

			allComments.push(
			{
				id: id,
				mark: mark,
				isNew: isNew,
				isAuthor: userLogin == authorLogin,
				hasImg: hasImg,
				hasLink: hasLink,
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
		var wnd = $('<div class="hbc" style="width: 80px; top: 55px; bottom: 10px; right: 32px; overflow: auto; position: fixed; z-index: 999;"></div>');
		$(wnd).css('background-color', _bgColor);
		$('body').append(wnd);
		$.each(comments, function (index, comment) {
			
			// right panel
			
			// create item
			var item = $('<div class="hbc__item" style="text-align: right;"><a href="#" onclick="return false">0</a></div>');
			//$('a', item).attr('href', '#' + comment.id);
			$('a', item).text(isNaN(comment.mark) ? '?' : (comment.mark >= 0 ? '+' + comment.mark : comment.mark));
			$('a', item).attr('iid', comment.id);

			// mark color
			if (comment.mark >= 0)
				$('a', item).css('color', _fgPositiveMark);
			else
				$('a', item).css('color', _fgNegativeMark);

			if (comment.isAuthor) {
				$('a', item).before('<span style="color: ' + _fgAuthor + '; font-weight: bold;">A </span>');
			}
			if (comment.hasImg) {
				$('a', item).before('<span style="color: ' + _fgImage + '; font-weight: bold;">i </span>');
			}
			if (comment.hasLink) {
				$('a', item).before('<span style="color: ' + _fgLink + '; font-weight: bold;">L </span>');
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
				item = $('<div class="hbc__mark-add" style="font-weight: bold; line-height: 6px; opacity: 0.4; text-align: right; padding-right: 25px; margin-top: -6px;"><span style="color: ' + _fgPositiveMark + ';">+' + comment.plus + '</span> <span style="color: ' + _fgNegativeMark + ';">-' + comment.minus + '</span></div>');				
				markItemWrapper.closest('.comment').find('.comment__head').after(item);
			}
			
		});

		// highlight author name
		$('.comment__head > a.user-info:contains("' + authorLogin + '")').css('background-color', _bgAuthor);
	}

	function Comment_OnClick() {
		$('.hbc__item').css('background-color', _bgColor);
		$('.hbc__item-when-new').css('background-color', _bgColorNew);
		$(this).css('background-color', _bgColorSelected);
		// go to url before browser "A" to emulate click at "A" two times. Habr has bug - click on "A" first time after page opening goes to wrong comment.
		//document.location = $(this).find('a').attr('href');
		
		// scroll to comment
		var id = $(this).find('a').attr('iid');
		var commentElement = document.getElementById(id);
		var elementPosition = GetElementPosition(commentElement);
		var viewHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
		window.scrollTo(0, elementPosition.top - viewHeight*_scrollTopOffsetPc);
		
		// highlight comment
		$(commentElement).effect("highlight", {}, _highlightIntervalMs);
	}
	
  function GetElementPosition(elem) {
    var body = document.body;
    var docEl = document.documentElement;

    var scrollTop = window.pageYOffset || docEl.scrollTop || body.scrollTop;
    var scrollLeft = window.pageXOffset || docEl.scrollLeft || body.scrollLeft;

    var clientTop = docEl.clientTop || body.clientTop || 0;
    var clientLeft = docEl.clientLeft || body.clientLeft || 0;

    var box = elem.getBoundingClientRect();
    var top  = box.top +  scrollTop - clientTop;
    var left = box.left + scrollLeft - clientLeft;

    return { top: Math.round(top), left: Math.round(left) };
  }
});