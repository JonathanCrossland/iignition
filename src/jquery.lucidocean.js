
/********************************** Rotate text *********************/

/*

<div class="textRotator">
    <div class="lighten">Cloud Applications</div>
    <div class="lighten">Business Intelligence</div>
    <div class="lighten">Email Notifications</div>
    <div class="lighten">Data driven</div>
    <div class="lighten">User Roles</div>
    <div class="lighten">Auditing</div>
    <div class="lighten">Workflow Rules</div>
</div>
 $(function () {
        $('.textRotator').rotateText({ speed: 1200 });
    });
*/
+function ($) {
	'use strict';

	function Plugin(options) {
	    options = options ? options : {};
	    options.speed = options.speed ? options.speed : 1000;
		return this.each(function () {
			var $this = $(this);

			var $elems = $this.find('span, li, div, p, h1, h2, h3, h4, h5, h6').not('[data-rotateText="false"]');
			
			$elems.css({ 'opacity': 0 });
			$this.find('[data-rotateText="false"]').css({'display':'block', 'opacity': '1', 'position':'relative'});
		   
			$elems.css({ 'position': 'absolute', 'left':'0','top':'0em','width': '100%', 'display':'block'})
			

			var child = 0;
			var speed = 0;
				$elems.eq(child).css({ 'opacity': 1 });
				

				function fade(child) {
				    window.clearTimeout(x);
					var x = setTimeout(function () {
						
						$elems.eq(child-1).animate({ 'opacity': '0' }, speed, function () {

						    $elems.eq(child).children().css({ 'opacity': '1' });
							$elems.eq(child).animate({
								'opacity': '1'
							}, speed);

							child++;
							if (child >= $elems.length) {
								child = 0;
							}

							fade(child);
						});


					}, speed);

                    
					speed = options.speed;

				};
				if (child == 0) {
				    speed = options.speed / 2
				}
				else {
				    speed = options.speed;
				}

				fade(child);
			
		})
	};

	$.fn.rotateText  = Plugin;
  
}(jQuery);


/********************************** Smooth Anchors *********************/
/*
$().smoothAnchors();
*/
+function ($) {

    'use strict';

    function Plugin(options) {
        options = options ? options : {};
        options.speed = options.speed ? options.speed : 700;

        //jQuery to collapse the navbar on scroll
        $(window).scroll(function () {
            if ($(".navbar").length > 0) {
                if ($(".navbar").offset().top > 200) {
                    $(".navbar-fixed-top").addClass("top-nav-collapse");
                } else {
                    $(".navbar-fixed-top").removeClass("top-nav-collapse");
                }
            }
        });
        
        var $links = $('a[href^="#"]');

        if (this.selector) {
            $links = $(this.selector);
        }

            $links.bind('click', function (event) {
                var $anchor = $(this);
                var href = $anchor.attr('href');
                var offset = $('body').data('offset') | 0;
                if (href.length > 1) {

                    $('html, body').stop().animate({
                        scrollTop: $(href).offset().top - offset, opacity: 1
                    }, options.speed, function () {
                        $('html, body').stop().scrollTop = $(href).offset().top - offset;
                       // event.preventDefault();
                       // event.stopPropagation();
                    });
                }
            });
        
    }

    $.fn.smoothAnchors = Plugin;

}(jQuery);




/*************************************      show scrollTop button      ************************/

+function ($) {
    'use strict';

    function Plugin(options) {
        options = options ? options : {};
        options.speed = options.speed ? options.speed : 700;
        var $this = $(this);
        $this.css({ display: 'none' });

        $(function () {
            $(document).scroll(function () {
                if ($(this).scrollTop() > 100) {
                    $this.css({ display: 'block' });
                } else {
                    $this.css({ display: 'none' });
                }
            });

            $this.on('click', function () {
                $('html, body').animate({ scrollTop: 0 }, options.speed);
            });
        });
    }

    $.fn.scrollToTop = Plugin;

}(jQuery);

+function ($) {
    'use strict';

    function Plugin(options) {
        options = options ? options : {};
        options.speed = options.speed ? options.speed : 700;
        var $this = $(this);

        $(function () {
            //debugger;
            var $sections = $this.find('section');
            var width = $sections.width();

            //$('form section .icon').css('color','red');

            //$sections.each(function () {
            //    var l = $(this).children().not('label').length;
            //    if (l >1) {
            //        $(this).children().css({ width: width/l, 'float': 'left' });
            //    }
            //});
          
        });
    }

    $.fn.formalize = Plugin;

}(jQuery);

/********************************** Smooth Anchors *********************/
/*
    $().scroller();
*/
+function ($) {

    'use strict';

    function Plugin(options, init, callback) {
        options = options ? options : {};
        options.min = options.min ? options.min : 0;
        options.max = options.max ? options.max : 100;

        if (options.showActive === undefined)
        {
            options.showActive = true
        } 

        var $this = $(this);

        $this.attr('data-OnScrollDirection', 'down');
        $this.attr('data-OnScrollCurrent', '0')
        if (init) {
            init($this.find('[data-OnScrollIndex]'));
        }
        var $el = $this;
        $this.on('mousewheel', onScroll);
        $this.children().on('mousewheel', onScroll);
        
        if (options.showActive === true) {
            $this.on('mouseenter', function () {
                $(this).attr('data-OnScrollActive', true);
            });
            $this.on('mouseleave', function () {
                $(this).attr('data-OnScrollActive', false);
            });
        }

        function onScroll (event) {

            var current = parseInt($this.attr('data-OnScrollCurrent'));

            if (event.deltaY >= 1) {
                if ($this.attr('data-OnScrollDirection') == 'up') {
                    current -= 1;
                }
                $this.attr('data-OnScrollDirection', 'up');

            } else {
                if ($this.attr('data-OnScrollDirection') == 'down') {
                    if (current < options.max) {
                        current += 1;
                    }
                }
                $this.attr('data-OnScrollDirection', 'down');
            }

            if (current <= options.min) {
                current = options.min;
                $this.attr('data-OnScrollDirection', 'down');
            }

            $el = $('[data-OnScrollIndex=' + current + ']');

            if (event.deltaY > 0) {
                if (callback) {
                    callback($el, { direction: 'up', index: current })
                }
                //$el.hide();
               // $el.css({ "visibility": "hidden" });
            } else {
                if (callback) {
                    callback($el,{ direction: 'down', index : current })
                }
                //$el.show();
                //$el.css({ "visibility": "visible" });
            }

            $this.attr('data-OnScrollCurrent', current);
            if ($el.length > 0) {
                event.preventDefault();
                event.stopPropagation();

            }
        }
        
    }

    $.fn.scroller = Plugin;

}(jQuery);

/* NAVbar incomplete */
+function ($) {
    'use strict';

    function Plugin(options) {
        options = options ? options : {};
        options.speed = options.speed ? options.speed : 700;
        var $this = $(this);
        options.originalHeight = options.originalHeight ? options.originalHeight : $(this).height();
        
        var $x = $this.find('ul');
        var $menu = $this.find('li.menu a');
        
        $(function () {
            $menu.on('click', function () {

                var open = $x.attr('data-open');
                
                if (open === "true") {
                    $x.animate({ height: options.originalHeight + 'px' }, 900).attr('data-open', false);
                }
                else {
                    $x.animate({ height: '100vh' }, 900).attr('data-open', true);
                }
                $x.toggleClass('responsive');
                
            });

            $(window).resize(reset).scroll(reset);

            function reset() {
                    $x.removeClass('responsive');
                    $x.removeAttr('style');
            }


            $this.on('click', function () {
                $('html, body').animate({ scrollTop: 0 }, options.speed);
                $(window).resize(reset).scroll(reset)
            });
        });

    }

    $.fn.navbar = Plugin;

}(jQuery);

+function ($) {
    'use strict';

    function Plugin(options) {
        options = options ? options : {};
        options.speed = options.speed ? options.speed : 700;
        var $this = $(this);
        $this.attr("tabindex", "1");
        var string = 'LO World\nWhere to..\n';
        var lines;
        var text = [];
        lines = string.split('\n');

        init(lines);

        function init(lines) {
            var i;
            for (i = 0; i < lines.length; i++) {
                text[i] = lines[i].split('');
            }


            console.log(text);
        }

        var currentLine = 0;
        var cursorPosition = text.length;

        var $cursor = $('<span class="cursor">|</span>');
        $(function () {
            draw();
            $this.resize(resize).scroll(resize);

            $this.on('keypress', keypress);
            $this.on('mousedown', mousedown);

            function keypress(e) {


                //if (ignorekey(e)) {

                //    return;
                //}

                if (checkbackspace(e)) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }

                text.insert(cursorPosition, String.fromCharCode(e.keyCode));
                cursorPosition++;

                draw();
                //e.preventDefault();
                //e.stopPropagation();
            }

            function mousedown(e) {

            }

            function draw() {

                var domFragment = document.createDocumentFragment();
                domFragment.innerHTML = '';
                $this.get(0).innerHTML = '';
                var pos = 0;
                var lineIndex = 0;
                text.forEach(function (line) {
                    console.log(line);

                    var lineStream = '';
                    if (line) {
                        line.forEach(function (char) {

                            lineStream += '<span data-pos="{0}">{1}</span>'.format(pos, char);
                            pos++;
                        });
                    }
                    domFragment.innerHTML += '<span data-line="{0}">{1}</span>'.format(lineIndex, lineStream);
                    lineIndex++;

                });
                console.log(domFragment.innerHTML);
                $this.append(domFragment.innerHTML);
                $this.find('span').off('click', spanclick);
                $this.find('span').on('click', spanclick);

                drawCursor();

            }

            function spanclick(e) {

                currentLine = parseInt($(this).attr('data-line'));
                cursorPosition = parseInt($(this).attr('data-pos'));
                if (isNaN(cursorPosition)) {
                    cursorPosition = lines[currentLine].length + 1;
                }
                drawCursor();
                e.preventDefault();
                e.stopPropagation();

            }

            function resize() {

            }
            function checkbackspace(e) {
                if (e.keyCode == 8) {

                    return true;
                }
            }
            function ignorekey(e) {

                if (e.ctrlKey == true) return true;
                if (e.keyCode == 20) return false; /* caps*/
                if (e.keyCode < 32 || e.keyCode > 90) return true;
            }


        });

        function drawCursor() {

            $cursor.remove();

            var $currentspan = $this.find('[data-pos=' + cursorPosition + ']');

            var $parent = $currentspan.parents('[data-line]');
            currentLine = parseInt($parent.attr('data-line'));
            console.log(currentLine);
            //console.log(cursorPosition);
            $parent.get(0).insertBefore($cursor.get(0), $currentspan.get(0));

        }

        // First, checks if it isn't implemented yet.
        if (!String.prototype.format) {
            String.prototype.format = function () {
                var args = arguments;
                return this.replace(/{(\d+)}/g, function (match, number) {
                    return typeof args[number] != 'undefined'
                      ? args[number]
                      : match
                    ;
                });
            };
        }
        if (!Array.prototype.insert) {
            Array.prototype.insert = function (index, item) {
                this.splice(index, 0, item);
            };
        }

    }

    $.fn.editor = Plugin;

}(jQuery);



+function ($) {
    'use strict';

    function Plugin(options) {
        options = options ? options : {};
        options.speed = options.speed ? options.speed : 700;


        var $this = $(this);
        var container = $this[0]


        var SEPARATION = 300, AMOUNTX = 50, AMOUNTY = 50;

        var fps = 100;
        var zoom = 70;
        var container, stats;
        var camera, scene, renderer;
        var particles, particle, count = 0;
        var mouseX = 0, mouseY = 0, startingPosX = -1800, startingPosY = -800, startingPositionZ = 900;
        var windowHalfX = window.innerWidth / 2;
        var windowHalfY = window.innerHeight / 2;
        var direction = 1; //0=up, 1=down
        var speed = 0.001;
        var cposY = 0, cposX = 0;
        var light1, light2, light3;
        var mesh;

        $(function () {


            init();
            animate();
            function init() {


                if (screen.width < 1200) {
                    SEPARATION = 200;
                    AMOUNTX = 10;
                    AMOUNTY = 10;
                    startingPosY = -1000;
                    startingPosX = -800;
                    startingPositionZ = 1000;
                }
                else {
                    SEPARATION = 300;
                    AMOUNTX = 40;
                    AMOUNTY = 40;
                    startingPosX = -1800;
                    startingPosY = -800;
                    startingPositionZ = 900;
                }

                container = document.getElementsByClassName('animationContainer')[0]; //document.createElement('div');

                
                var width = window.innerWidth, height = window.innerHeight;
                
                camera = new THREE.PerspectiveCamera(zoom, width / height, 1, 10000);
                camera.position.z = startingPositionZ;
                scene = new THREE.Scene();
             
             
             
                particles = new Array();
                var PI2 = Math.PI * 2;
               
                var material = new THREE.SpriteCanvasMaterial({
                    program: function (context) {
                        context.beginPath();
                        context.fillStyle = 'rgba(22, 116, 178, .5)',
                        context.arc(0, 0, .5, 3, PI2, true);
                        context.fill();
                    }
                });

              
           

                var i = 0;
                for (var ix = 0; ix < AMOUNTX; ix++) {
                    for (var iy = 0; iy < AMOUNTY; iy++) {
                        particle = particles[i++] = new THREE.Sprite(material);
                        particle.position.x = ix * SEPARATION - ((AMOUNTX * SEPARATION) / 8);
                        particle.position.z = iy * SEPARATION - ((AMOUNTY * SEPARATION) / 2);
                        
                        scene.add(particle);
                    }
                }


                renderer = new THREE.CanvasRenderer({ alpha: true });
                renderer.setPixelRatio(window.devicePixelRatio);
                renderer.setSize(window.innerWidth, window.innerHeight);

                $(container).prepend(renderer.domElement);
                $(container).css({ overflow: 'hidden' });
                $(renderer.domElement).css({ position: 'relative', top: 0 });

                document.addEventListener('mousemove', onDocumentMouseMove, false);
          
                window.addEventListener('resize', onWindowResize, false);


            }
            function onWindowResize() {


                windowHalfX = window.innerWidth / 2;
                windowHalfY = window.innerHeight / 2;
                camera.aspect = window.innerWidth / window.innerHeight;

                camera.updateProjectionMatrix();
                renderer.setSize(window.innerWidth, window.innerHeight);

            }
            //
            function onDocumentMouseMove(event) {
                mouseX = event.clientX - windowHalfX;
                mouseY = event.clientY - windowHalfY;
            }
            function onDocumentTouchStart(event) {
                if (event.touches.length === 1) {
                    event.preventDefault();
                    mouseX = event.touches[0].pageX - windowHalfX;
                    mouseY = event.touches[0].pageY - windowHalfY;
                }
            }
            function onDocumentTouchMove(event) {
                if (event.touches.length === 1) {
                    event.preventDefault();
                    mouseX = event.touches[0].pageX - windowHalfX;
                    mouseY = event.touches[0].pageY - windowHalfY;
                }
            }
            //
            function animate() {

                setTimeout(function () {
                    requestAnimationFrame(animate);
                }, 1000 / fps);

                render();

                //requestAnimationFrame(animate);
                //render();

            }
           

            function render() {
               

                cposY = startingPosY + mouseY /4;
                cposX = startingPosX + mouseX / 4;

                camera.position.x += (cposX - camera.position.x) * .5;
                camera.position.y += (-cposY - camera.position.y) * .5;

               
                camera.lookAt(scene.position);
                
                renderer.clear();
                var i = 0;
                for (var ix = 0; ix < AMOUNTX; ix++) {
                    for (var iy = 0; iy < AMOUNTY; iy++) {
                        particle = particles[i++];
                        particle.position.y = (Math.sin((ix + count) * 0.25) * 200) + (Math.sin((iy + count) * 0.5) * 30);
                        particle.scale.x = particle.scale.y = (Math.sin((ix + count) * 0.3) + 1) * 5 + (Math.sin((iy + count) * 0.5) + 1) * 100;
                    }

                    if (direction == 0) {
                        camera.position.z += speed;

                        if (camera.position.z > 800) {
                            direction = 1;
                        }
                    }
                    else if (direction == 1) {
                        camera.position.z -= speed;
                        if (camera.position.z < 0) {
                            direction = 0;
                        }
                    }
                }
                
                //var time = Date.now() * 0.0005;
                //light.position.x = Math.sin(time * 0.7) * 30;
                //light.position.y = Math.cos(time * 0.5) * 40;
                //light.position.z = Math.cos(time * 0.3) * 30;

                renderer.render(scene, camera);
                count += 0.1;

            }

        });

    }

    $.fn.waveanimation = Plugin;

}(jQuery);


//+function ($) {
//    'use strict';

//    var divElement = undefined;
//    var fireLeave = false;

//    function Plugin(options) {
//        options = options ? options : {};
//        options.speed = options.speed ? options.speed : 700;
//        var $this = $(this);
      
      
//        $this.on('mouseenter', function (e) {

//            if (divElement == undefined) {
//                var title = $this.attr('data-mouseTip');
//                    var div = "<div class='mouseTip'>" + title + "</div>";
//                    divElement = $(div)
//                    $('body').append(divElement);
                
//                    divElement.css({ display: 'block', position: 'absolute', left: e.pageX, top: e.pageY, width: '200px', height: '50px' });
//            }
//            fireLeave = false;
//            });

//            $this.on('mouseout', function () {
//                if (divElement) {
//                    fireLeave = true;
//                    setTimeout(function () {
//                        if (fireLeave) {
//                            divElement.remove();
//                            divElement = undefined;
//                        }
//                    }, 200);
                    
//                }
//            });

//            $this.on('mousemove', function (e) {
//                if (divElement) {
//                    divElement.css({ left: e.pageX, top: e.pageY, 'transition':'all 550ms ease-in'})
//                }
//            });
       
//    }

//    $.fn.mouseTip = Plugin;

//}(jQuery);


/*************************************      show scrollTop button      ************************/


+function ($) {
    'use strict';

    function Plugin(options, callback) {
        options = options ? options : {};
        options.speed = options.speed ? options.speed : 200;
      
        options.showClass = options.showClass ? options.showClass : '';


        var $this = $(this);
        var top = 0;

        $(function () {
            $(document).scroll(function () {
                top = $(this).scrollTop() + window.innerHeight;
                checkElements();
            });
        });

        function checkElements() {
          
           
            $(this).attr('data-revealed', 'false');

            $('[data-revealed="false"]').each(function () {
                var el = $(this)[0];
                var rect = el.getBoundingClientRect();

                var elTop = $(this).offset().top;
                

                if (top > (elTop)) {
                    $(this).attr('data-revealed', 'true');
                   
                    if (options.showClass == '') {
                        $(this).css({ 'opacity': '1', 'transition-duration': options.speed + 'ms' });
                    } else {
                        $(this).removeAttr('style');
                        $(this).css({ 'transition-duration': options.speed + 'ms', });
                        $(this).addClass(options.showClass);
                    }
                    
                    if (callback) {
                        callback($(this));
                    }
                }
            });
        }

        return this.each(function () {
            $(this).attr('data-revealed', 'false');
            $(this).css({ 'opacity': '.001' });
        });

    }

    $.fn.showOnScroll = Plugin;

}(jQuery);