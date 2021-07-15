// ==UserScript==
// @name        habr-best-comments
// @namespace   http://habr.com
// @include     https://habr.com/ru/post/*
// @include     https://habr.com/ru/company/*
// @include     https://habr.com/ru/article/*
// @include     https://habr.com/ru/news/*
// @include     https://habr.com/en/post/*
// @include     https://habr.com/en/company/*
// @include     https://habr.com/en/article/*
// @include     https://habr.com/en/news/*
// @grant       none
// @run-at      document-start
// @version     1.0.3
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

window.addEventListener('DOMContentLoaded', Run);
window.addEventListener('load', Run);

var observeDOM = (function() {
    var MutationObserver = window.MutationObserver || window.WebKitMutationObserver;

    return function( obj, callback ) {
        if (!obj || obj.nodeType !== 1) {
            return;
        }

        if (MutationObserver) {
            // define a new observer
            var mutationObserver = new MutationObserver(callback);

            // have the observer observe foo for changes in children
            mutationObserver.observe(obj, { childList:true, subtree:true });
            return mutationObserver;
        }
    }
})();

var processCommentsTimerId;

function Run() {
	// if we called from 'DOMContentLoaded' then we don't need be called from 'onload'
	 window.removeEventListener('load', Run);

    var hasCommentsSection = document.querySelector(".tm-article-comments") != null;
    if (!hasCommentsSection) {
        return;
    }

    ObserveComments();

    ProcessComments();
}

function ObserveComments() {
    var observer = observeDOM(document.querySelector(".tm-article-comments").parentNode, function(m) {
        observer.disconnect();
        clearTimeout(processCommentsTimerId);
        processCommentsTimerId = setTimeout(function() {
            ProcessComments();
            ObserveComments();
        }, 500);
    });
}

function ProcessComments() {
	// options
	var _fgAuthor = '#F76D59';
	var _bgAuthor = '#FFAA9D';
	var _fgPositiveMark = '#339900';
	var _fgNegativeMark = '#CC0000';
	var _fgZeroMark = '#548EAA';
	var _bgColor = '#F8F8F8';
	var _bgColorNew = '#E8E8FF';
	var _bgColorSelected = '#3D438D';
	var _highlightIntervalMs = 1500;
	var _scrollTopOffsetPc = 0.2;
	var _fgMedia = '#0000FF';
	var _fgLink = '#366804';


	var authorElement = document.querySelector(".tm-user-info__username");
	var authorLogin = authorElement ? authorElement.href.split("/").filter(x => x != "").pop() : "";

    ShowCommentsPanel();
/*
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
*/


	function ShowCommentsPanel() {
		var allComments = GetAllComments();
		ShowComments(allComments);
	}

	function GetAllComments() {
		var allComments = [];
        document.querySelectorAll(".tm-comment-thread-functional__comment").forEach(item => {
			var isBanned = item.querySelector(".tm-comment__ufo") != null;
			if (isBanned) {
				return;
			}
			var id = item.querySelector(".tm-comment-thread-functional__target").getAttribute("name");
			var markTitleElement = item.querySelector(".tm-votes-meter__value") || item.querySelector(".tm-votes-lever");
            var markTitle = markTitleElement.getAttribute("title");
			var plus = 0;
			var minus = 0;
			if (markTitle) {
				plus = +(markTitle.match(/↑(\d+)/) || [])[1];
				minus = +(markTitle.match(/↓(\d+)/) || [])[1];
			}
			var isNew = item.querySelector(".tm-comment-thread-functional__target").getAttribute("[data-comment-new]") != null;
			var userInfoHref = item.querySelector(".tm-user-info__username").getAttribute("href") || "";
			var userLogin = userInfoHref.split("/").filter(x => x != "").pop();
            var mark = plus - minus;
			var hasImg = item.querySelector(".tm-comment__body-content img") != null;
			var hasVideo = item.querySelector(".tm-comment__body-content iframe") != null;
			var hasLink = item.querySelector(".tm-comment__body-content a") != null;

			allComments.push(
			{
				id: id,
				mark: mark,
				isNew: isNew,
				isAuthor: userLogin == authorLogin,
				hasImg: hasImg,
				hasVideo: hasVideo,
				hasLink: hasLink,
				plus: plus,
				minus: minus,
                element: item
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
        var wnd = document.createElement("div");
        wnd.className = "hbc";
        wnd.style = "width: 80px; top: 55px; bottom: 10px; right: 49px; overflow: auto; position: fixed; z-index: 999; line-height: 1.1em; font-size: 15px; background-color: " + _bgColor;
		document.body.appendChild(wnd);
		comments.forEach(comment => {

			// right panel

            var itemText = isNaN(comment.mark) ? '?' : (comment.mark > 0 ? '+' + comment.mark : comment.mark);
            var itemColor = _fgZeroMark;
			if (comment.mark > 0)
				itemColor = _fgPositiveMark;
			else if (comment.mark < 0)
				itemColor = _fgNegativeMark;

            var aPrefix = "";
			if (comment.isAuthor) {
				aPrefix += '<span style="color: ' + _fgAuthor + '; font-weight: bold;">A </span>';
			}
			if (comment.hasImg) {
				aPrefix += '<span style="color: ' + _fgMedia + '; font-weight: bold;">i </span>';
			}
			if (comment.hasVideo) {
				aPrefix += '<span style="color: ' + _fgMedia + ';">v </span>';
			}
			if (comment.hasLink) {
				aPrefix += '<span style="color: ' + _fgLink + '; font-weight: bold;">L </span>';
			}

			// create item
            var item = document.createElement("div");
            item.className = "hbc__item";
            item.style = "text-align: right;";
            item.innerHTML = aPrefix + '<a href="#" onclick="return false" style="color: ' + itemColor + '">' + itemText + '</a>';
            item.setAttribute("iid", comment.id);

			// bg color
			if (comment.isNew) {
				item.classList.add("hbc__item-when-new");
                item.style.backgroundColor = _bgColorNew;
			}

			// onclick event
			item.onclick = Comment_OnClick;

			// add item
			wnd.appendChild(item);


			// add plus/minus to the comment mark

			if (comment.plus > 0 && comment.minus > 0) {
                var prevScoreDetails = comment.element.querySelector(".hbc__mark-add");
                if (prevScoreDetails) {
                    prevScoreDetails.remove();
                }

                var scoreDetails = document.createElement("div");
                scoreDetails.className = "hbc__mark-add";
                scoreDetails.style = "font-weight: bold; line-height: 6px; opacity: 0.4; text-align: left; margin-top: 5px; position: absolute; width: 100px; font-size: 13px;";
                scoreDetails.innerHTML = '<span style="color: ' + _fgPositiveMark + ';">+' + comment.plus + '</span> <span style="color: ' + _fgNegativeMark + ';">-' + comment.minus + '</span>';
                var votesElement = comment.element.querySelector(".tm-votes-meter__value") || comment.element.querySelector(".tm-votes-lever__score-counter");
                votesElement.appendChild(scoreDetails);
			}

		});

		// highlight author name
		//$('.comment__head > a.user-info:contains("' + authorLogin + '")').css('background-color', _bgAuthor);
	}

	function Comment_OnClick() {
		document.querySelectorAll(".hbc__item").forEach(item => item.style.backgroundColor = _bgColor);
		document.querySelectorAll(".bc__item-when-new").forEach(item => item.style.backgroundColor = _bgColorNew);
		this.style.backgroundColor = _bgColorSelected;
		// go to url before browser "A" to emulate click at "A" two times. Habr has bug - click on "A" first time after page opening goes to wrong comment.
		//document.location = $(this).find('a').attr('href');

		// scroll to comment
		var id = this.getAttribute("iid");
		var commentElement = document.getElementsByName(id)[0];
		var elementPosition = GetElementPosition(commentElement);
		var viewHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
		window.scrollTo(0, elementPosition.top - viewHeight*_scrollTopOffsetPc);

		// highlight comment
        commentElement.style.backgroundColor = 'yellow';
        setTimeout(function(){ commentElement.style.backgroundColor = '' ; }, _highlightIntervalMs);
	}

    function GetElementPosition(elem) {
        var body = document.body;
        var docEl = document.documentElement;

        var scrollTop = window.pageYOffset || docEl.scrollTop || body.scrollTop;
        var scrollLeft = window.pageXOffset || docEl.scrollLeft || body.scrollLeft;

        var clientTop = docEl.clientTop || body.clientTop || 0;
        var clientLeft = docEl.clientLeft || body.clientLeft || 0;

        var box = elem.getBoundingClientRect();
        var top = box.top + scrollTop - clientTop;
        var left = box.left + scrollLeft - clientLeft;

        return { top: Math.round(top), left: Math.round(left) };
    }
}
