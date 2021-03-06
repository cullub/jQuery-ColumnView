/*!
 * mapAttributes jQuery Plugin v1.0.0
 *
 * Copyright 2010, Michael Riddle
 * Licensed under the MIT
 * http://jquery.org/license
 *
 * Date: Sun Mar 28 05:49:39 2010 -0900
 */

jQuery.fn.mapAttributes = function(prefix) {
	var maps = [];
	$(this).each(function() {
		var map = {};
		for(var key in this.attributes) {
			if(!isNaN(key)) {
				if(!prefix || this.attributes[key].name.substr(0,prefix.length) == prefix) {
					map[this.attributes[key].name] = this.attributes[key].value;
				}
			}
		}
		maps.push(map);
	});
	return (maps.length > 1 ? maps : maps[0]);
};


/**
 * jquery.columnview-1.4.js
 *
 * Created by Chris Yates on 2009-02-26.
 * http://christianyates.com
 *
 * Copyright 2009 Christian Yates and ASU Mars Space Flight Facility. All rights reserved.
 * Copyright 2011 Manuel Odendahl <wesen@ruinwesen.com>
 * Copyright 2012 James Roberts <feedthefire@gmail.com>
 * Copyright 2016 Caleb Gregory <gregoryplace@icloud.com>
 *
 * Supported under jQuery 1.5.x or later
 *
 * Dual licensed under MIT and GPL.
 */

(function($) {
	var defaults = {
		height:			'200px',	// Height of containerobj
		multi:			false,		// Allow multiple selections
		preview:		true,		// Handler for preview pane - true for default handeler, false for no preview
		fixedwidth:		false,		// Use fixed width columns
		addCSS:			true,		// enable to have columnview automatically insert its CSS
		useCanvas:		false,		// enable to have columnview generate a canvas arrow to indicate subcategories.  Disable to use CSS instead
		attrs: [],					// attributes to pull from original items
		autoFocus:		true,		// focus to column onclick
		getSubtree: 	getSubtree,	// callback for getting new data. Default: getSubtree
		onChange:		undefined,	// callback for onclick
	};

  // Firefox doesn't repeat keydown events when the key is held, so we use
  // keypress with FF/Gecko/Mozilla to enable continuous keyboard scrolling.
  var isFirefox = typeof InstallTrigger !== 'undefined'; //kind of a hack to check whether browser is FF (http://stackoverflow.com/a/9851769/3437608)
  var key_event = isFirefox ? 'keypress' : 'keydown';
  
  /**
   * default subtree function, returns child elements of the original list.
   **/
  var getSubtree = function (elt) { //elt stands for element - this should return the children of elt.
    var children = $(elt).data("sub");
    if (children) {
      return children.children('li');
    } else {
      return $(elt).children('li');
    }
  };

  var methods = {
  
  //init: initial setup
    init: function (options) {
      var $this = $(this);
      var data = $this.data("columnview");

      if (data) {
        /* plugin has already been initialized */
        console.log("already initialized");
        return $this;
      }
      
      var settings = $.extend({}, defaults, options);

      /* fix order of declaration */
      if (!settings.getSubtree) {
        settings.getSubtree = getSubtree;
      }
	
	//whether to add the CSS to document
      if (settings.addCSS) {
        addCSS();
      }
      
      // Hide original list
      $(this).hide();

      // Reset the original list's id
      var origid = $this.attr('id');

      // Create new top container (first column)
      var $container = $('<div/>').addClass('containerobj').css({'height':settings.height}).attr({'id':origid + '-columnview-container'}).insertAfter($this);
      var $topdiv    = $('<div class="top"></div>').appendTo($container);

      data = { settings:  settings,    
               container: $container, 
               origElt:   $this };
      
      $this.data("columnview", data);
      $container.data("columnview", data);

      /* populate the first column */
      submenu($container, $this, $topdiv);

      /* bind events on the newly created column entries */
      $container.bind("click dblclick " + key_event, methods.handleEvent);
      
      return $this;
    },

    container: function () {
      var data = $(this).data("columnview");
      if (!data) {
        return;
      }
      return data.container;
    },

    /**
     * Handle a click event on an item inside the menu.
     *
     * Pass shiftKey and metaKey for multiple selection purposes.
     **/
    handleClick: function (self, shiftKey, metaKey) {
      var $self = $(self);
      var $container = $self.parents('div.containerobj:first');
      var data = $container.data("columnview");
      if (!data) {
        return;
      }
      var container = data.container;
      var origElt = data.origElt;
      var settings = data.settings;

      $self.focus();
	  	
	  	if ($self.closest('.feature').length) {
	  		//it's a preview, so don't do anything
	  		return;	
	  	}
      
      var level = $('div', container).index($self.parents('div'));
      // Remove blocks to the right in the tree, and 'deactivate' other
      // links within the same level, if metakey is not being used
      $('div:gt('+level+')', container).remove();
      
      if (metaKey) {
        /* on meta key, toggle selections, and remove nothing */
        if ($self.hasClass('active')) {
          $self.removeClass('active');
        } else {
          $self.addClass('active');
        }
      } else if (shiftKey) {
        // Select intermediate items when shift clicking
        // Sorry, only works with jQuery 1.4 due to changes in the .index() function
        var first = $('a.active:first', $self.parent()).index();
        var cur = $self.index();
        var range = [first, cur].sort(function(a,b) { return a - b; });
        $('div:eq('+level+') a', container).slice(range[0], range[1]).addClass('active');
        $self.addClass('active');
      } else {
      	//no shift key, and no meta key.
      	
      	//remove classes active and inpath in anchors in same level
        $('div:eq('+level+') a', container)
          .removeClass('active')
          .removeClass('inpath');
          
        //add class inpath to currently selected item, and remove class active
        $('.active', container).addClass('inpath');
        $('div:lt('+level+') a', container).removeClass('active');
		
		//highlight the new one (that just got clicked)
        $self.addClass('active');
        
        //if the new item has children add another menu
        if ($self.hasClass("hasChildMenu")) {
          // Menu has children, so add another submenu
          submenu(container, $self);
          /* triggering will happen in submenu */
          return;
        } else { 
          // No children; show preview (title if it exists, or a just text)        
          if (settings.preview) {
          	  // If preview, append preview pane
		      var previewcontainer = $('<div/>').addClass('feature').appendTo(container);
			  
			  // Fire preview handler function (set manually in settings, else default)
			  if ($.isFunction(settings.preview)) {
				// We're passing the element back to the callback
				var preview = settings.preview($self);
			  } else {
				// If preview is not a function, use default behavior
				var title = $('<span/>')
				  .attr({href: $self.attr('href')})
				  .text($self.attr('title') ? $self.attr('title') : $self.text());
				$(previewcontainer).html(title);
			  }
          }
          // Set the width
          var remainingspace = 0;
          $.each($(container).children('div').slice(0,-1),function(i,item){
            remainingspace += $(item).width();
          });
          var fillwidth = $(container).width() - remainingspace;
          $(previewcontainer).css({'top':0,'left':remainingspace}).width(fillwidth).show();
        }
      } 

      origElt.trigger("columnview_select", [container.find(".active")]);
    },

    /**
     * Navigate to an item with attrName = key.
     *
     * attrName is "name" by default.
     *
     * This looks up the item in the original list, and clicks its way
     * through the parents to reach it (it will thus call onchange on
     * the intermediate items, just as if the user navigated to it).
     *
     **/
    navigateTo: function (key, attrName) {
      var $this = $(this);
      var $container;
      if ($this.hasClass('containerobj')) {
        $container = $this;
      } else {
        $container = $this.parents('div.containerobj:first');
      }
      var data = $container.data("columnview");
      if (!data) {
        return;
      }
      var container = data.container;
      var origElt   = data.origElt;
      var settings  = data.settings;
      
      if (!attrName) {
        attrName = "name";
      }

      var origLinks = origElt.find("[" + attrName + "=" + key + "]").parentsUntil(origElt).filter("li").find(":eq(0)");
      var keys = origLinks.map(function (i, elt) { return $(elt).attr(attrName); }).toArray().reverse();

      $.each(keys, function (i, elt) {
        var entry = container.find("[" + attrName + "=" + elt + "]");
        methods.handleClick(entry);
      });
    },

    // Event handling functions
    handleEvent: function (event) {
      var $this = $(this);
      var $self = undefined;
      var data = $this.data("columnview");
      if (!data) {
        return;
      }
      var container = data.container;
      var origElt = data.origElt;
      var settings = data.settings;

      var $target = $(event.target);

      if ($target.is("a,span")) {
        if ($target.is("span")){
          $self = $target.parent(); //if it's a span, set $self to the span's parent element (should be an anchor)
        }
        else {
          $self = $target; //if it's an anchor, set $self to it.
        }
		
		//if multiple selection is disabled, ignore the shift and meta keys.
        if (!settings.multi) {
          delete event.shiftKey;
          delete event.metaKey;
        }

        $self.focus();
		
		//if the event was a doubleclick, call the doubleclick function
        if (event.type == "dblclick") {
          origElt.trigger("columnview_dblclick", [$self]);
        }

        // Handle clicks
        if (event.type == "click") {
        	//call the handleClick method
          	methods.handleClick($self, event.shiftKey, event.metaKey);
	      	
	      	//if autoFocus is set to true, give this column focus
	      	if(settings.autoFocus) container.scrollLeft($self.offsetParent().offset().left);

          	if (!$self.closest('.feature').length) {
	  			//it's not a preview (that got clicked), so if there's a handler for onChange, call that
	      		if(settings.onChange) settings.onChange(container.find(".active"));
	      	}
        }
		
		// Handle Keyboard navigation
        if (event.type == key_event){
        	console.log(event.keyCode);
          switch (event.keyCode){
          case (37): //left
            $self.parent().prev().children('.inpath').focus().trigger("click");
            event.preventDefault();
            break;
          case (38): //up
            $self.prev().focus().trigger("click");
            event.preventDefault();
            break;
          case (39): //right
            if ($self.hasClass('hasChildMenu')) {
              $self.parent().next().children('a:first').focus().trigger("click");
              event.preventDefault();
            }
            break;
          case (40): //down
            $self.next().focus().trigger("click");
            event.preventDefault();
            break;
          case (13): //enter
            $self.trigger("dblclick");
            event.preventDefault();
            break;
          }
        }
      }

    }
  };

  /**
   * Dispatcher method for the jQuery plugin. Call without arguments
   * or options to call the initializer, or pass a method name and
   * arguments:
   *
   * $(elt).columnview();
   * $(elt).columnview('navigateTo', 'foobar');
   *
   **/
  $.fn.columnview = function(method) {
    if ( methods[method] ) {
      return methods[ method ].apply( this, Array.prototype.slice.call( arguments, 1 ));
    } else if ( typeof method === 'object' || ! method ) {
      return methods.init.apply( this, arguments );
    } else {
      $.error( 'Method ' +  method + ' does not exist on jQuery.columnview ');
    }
  };

  // Generate deeper level menus
  function submenu(container, node, submenu) {

    var data = container.data("columnview");
    if (!data) {
      return;
    }
    var origElt   = data.origElt;
    var settings  = data.settings;

    var width = false;
    var isIE = /*@cc_on!@*/false || !!document.documentMode; //http://stackoverflow.com/a/9851769/3437608 - to replace $.browser.msie, which is gone since jQuery 1.9
    if (settings.fixedwidth || isIE) {
      width = typeof settings.fixedwidth == "string" ? settings.fixedwidth : '200px';
    }

    var leftPos = 0;
    $.each($(container).children('div'), function(i, mydiv){
      leftPos += $(mydiv).width();
    });

    if (!submenu) {
      submenu = $('<div/>').css({'top':0, 'left':leftPos}).appendTo(container);
    }

    // Set column width
    if (width) {
      $(submenu).width(width);
    }

    var appendItems = function (items) {
      submenu.html('');
      $.each($(items), function(i, item) {
        var $item = $(item);
        var $subitem = $('a:eq(0)', $item)
          .clone(true)
          .wrapInner('<span class="label" />')
          .data('sub', $item.children('ul'))
          .appendTo(submenu);
        if (!$subitem.length) {
          /* something went wrong with finding an inner item */
          return;
        }
        
        if(settings.attrs && settings.attrs.length > 0){
        	$.each(settings.attrs,function(i,attr){
	        	if($item.attr(attr)) $subitem.attr(attr,$item.attr(attr)).data(attr,$item.attr(attr));
        	});
        }
        
        if (width) {
          $subitem.css({'text-overflow':     'ellipsis',
                        '-o-text-overflow':  'ellipsis',
                        '-ms-text-overflow': 'ellipsis'} );
        }

        if ($subitem.data('sub').length || $item.attr("hasChildren")) {
          $subitem.addClass('hasChildMenu');
          addWidget(settings, $subitem);
        }
      });

      /* trigger only after the data is added, not in handleEvent as there could be a deferred in between */
      origElt.trigger("columnview_select", [$(node)]);

    };
	
    var res = settings.getSubtree($(node), $(node).attr("id") == $(origElt).attr("id"));
    /* check if getSubtree returned a deferred promise. */
    if (res && res.promise) {
      $(submenu.append('<span class="loading">Loading...</span>'));
      res.promise().then(appendItems);
    } else {
      appendItems(res);
    }
  }

  /***************************************************************************
   *
   * Graphics and CSS stuff
   *
   ***************************************************************************/

  // Uses canvas, if available, to draw a triangle to denote that item is a parent
  function addWidget(settings, item, color){
    var useCss = false;

    if (!settings.useCanvas) {
      useCss = true;
    } else {
      var triheight = $(item).height();
      var canvas = $("<canvas></canvas>")
        .attr({height: triheight,
               width:  10})
        .addClass('widget').appendTo(item);
      if (!color) {
        color = $(canvas).css('color');
      }
      canvas = $(canvas).get(0);
      if (canvas.getContext){
        var context = canvas.getContext('2d');
        context.fillStyle = color;
        context.beginPath();
        context.moveTo(3,(triheight/2 - 3));
        context.lineTo(10,(triheight/2));
        context.lineTo(3,(triheight/2 + 3));
        context.fill();
      } else {
        useCss = true;
      }
    }

    if (useCss) {
      /**
       * Canvas not supported - put something in there anyway that can be
       * suppressed later if desired. We're using a decimal character here
       * representing a "black right-pointing pointer" in Windows since IE
       * is the likely case that doesn't support canvas.
       */
      $("<span>&#9658;</span>").addClass('widget').css({'height':triheight,'width':10}).prependTo(item);
    }

    $('.widget').bind('click', function(event){
      event.preventDefault();
    });
  }

  function addCSS() {
    // Add stylesheet, but only once
	var cssId = 'columnViewCss';  // you could encode the css path itself to generate id..
	if (!document.getElementById(cssId)) {
	    var head  = document.getElementsByTagName('head')[0];
	    var link  = document.createElement('link');
	    link.id   = cssId;
    	link.rel  = 'stylesheet';
	    link.type = 'text/css';
	    link.href = 'css/jquery.columnview.css';
	    link.media = 'all';
	    head.appendChild(link);
	}
  }

})(jQuery);
