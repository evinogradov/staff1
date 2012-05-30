var AppView = Backbone.View.extend({
    el: config.selectors.wrapper,
    els: {},
    template: _.template($('#template_page').html()),
    initialize: function(){

        $(this.el).html(this.template());

        this.els.page = $(config.selectors.page);
        this.els.header = $(config.selectors.header.container, this.el);
        this.els.content = $(config.selectors.content.container, this.el);
        this.els.wrapper = $(config.selectors.content.wrapper, this.el);

        this.model.bind('change', this.toggle, this);

        this.header = new HeaderView({
            el: this.els.header,
            page: this.page,
            options: this.options,
            app: this
        });
    },
    toggle: function(){

        var page = this.model.get('page'),
            options = this.model.get('options'),
            params;

        if ( !_.isEqual(this.page, page) ) {

            console.log('APP THIS RENDER', page, options);

            this.page = this.model.get('page');
            this.options = this.model.get('options');
            this.render();
        }

        else {

            if ( !_.isEqual(this.options, options) ) {

                console.log('APP THIS PART-RENDER', page, options);

                params = {
                    page: page,
                    options: options
                };

                if ( page.menu ) this.menu.render(params);
                if ( page.order ) this.order.render(params);
                if ( page.favourites ) this.favourites.render(params);

                this.page = this.model.get('page');
                this.options = this.model.get('options');
            }
        }
    },
    render: function(){

        if ( this.page.menu ) {
            this.menu = new MenuView({
                model: new MenuModel(),
                el: this.els.wrapper,
                app: this
            });
        }

        if ( this.page.order ) {
            this.order = new OrderView({
                model: new OrderModel(),
                el: this.els.wrapper,
                app: this
            });
        }

        if ( this.page.favourites ) {
            this.favourites = new FavouritesView({
                model: new FavouritesModel(),
                el: this.els.wrapper,
                app: this
            });
        }
    },
    renderMenu: function(options){
        this.menu.render(options);
    },
    resetPage: function(){

        _.each(config.classes.page, function(className){
            this.els.page.removeClass(className);
        }, this);

        _.each(config.classes.content, function(className){
            this.els.content.removeClass(className);
        }, this);

    }
});







var HeaderView = Backbone.View.extend({
    els: {},
    templates: {
        header: _.template($('#template_header').html()),
        provider: _.template($('#template_header-provider').html())
    },
    initialize: function(data){
        this.app = data.app;
        this.render();
    },
    render: function(){

        $(this.el).html(this.templates.header());

        this.els.providers = {
            container: $(config.selectors.header.providers),
            list: $(config.selectors.header.providerList)
        };

        this.els.days = {
            items: $(config.selectors.header.day),
            titles: $(config.selectors.header.dayTitle),
            actions: $(config.selectors.header.dayActionsItem)
        };

        this.els.complete = $(config.selectors.header.completeButton);

        this.app.els.page.bind('click keydown', $.proxy(function(event){

            var target =    $(event.target),
                condition = ( event.type === 'click' && !target.parents().is(config.selectors.header.day) ) ||
                            ( event.type === 'keydown' && event.which === 27 );
            condition && this.hideActions();

        }, this));

        this.els.days.actions.click($.proxy(this.hideActions, this));

    },
    showActions: function(event){
        $(event.target)
            .parents(config.selectors.header.day)
            .addClass(config.classes.header.dayOpened);
    },
    hideActions: function(){
        this.els.days.items
            .removeClass(config.classes.header.dayOpened);
    },
    bindDayEvents: function(menu){

        this.els.days.items
            .addClass(config.classes.header.dayInactive);

        _.each(menu, function(data, day){
            this.els.days.items
                .filter('[rel="' + day + '"]')
                .data({ date: data.date })
                .removeClass(config.classes.header.dayInactive);
        }, this);

        this.els.days.items
            .not('.'+ config.classes.header.dayInactive)
            .find(this.els.days.titles)
            .click($.proxy(function(event){
                this.hideActions();
                this.showActions(event);
            }, this));
    },
    renderProviders: function(menu, day, provider){

        this.els.providers.container.removeClass(config.classes.header.providersInactive);
        this.els.providers.list.empty();

        _.each(menu[day].providers, $.proxy(function(dishes, provider){
            this.els.providers.list.append(this.templates.provider({
                name: provider,
                day: day
            }));
        }, this));

        this.els.providers.items = $(config.selectors.header.provider);
        this.els.providers.names = $(config.selectors.header.providerName);

        this.els.providers.items
            .removeClass(config.classes.header.providerActive)
            .filter('[rel="' + provider + '"]')
            .addClass(config.classes.header.providerActive);

    },
    disableProviders: function(){

        this.els.providers.container.addClass(config.classes.header.providersInactive);
        this.els.providers.items.removeClass(config.classes.header.providerActive);
        this.els.providers.names.removeAttr('href');
    },
    toggleDay: function(day){

        this.els.days.items
            .removeClass(config.classes.header.dayActive)
            .filter('[rel="' + day + '"]')
            .addClass(config.classes.header.dayActive);

    },
    makeOrder: function(order){

        // TODO: save model

        this.els.complete.click($.proxy(function(){

            if ( _.isEmpty(order) ) return;

            var success = function(data){
                    console.log('order OK', data);
                },
                error = function(data){
                    console.log('order FAIL', data);
                };

            $.ajax({
                type: 'POST',
                contentType: 'application/json',
                url: '/api/v1/order/',
                data: $.stringify(order),
                success: function(data){
                    data.status === 'ok'
                        ? success(data)
                        : error(data);
                },
                error: error
            });

        }, this));
    }
});




var MenuView = Backbone.View.extend({
    els: {},
    templates: {
        group: _.template($('#template_menu-group').html()),
        item: _.template($('#template_menu-item').html()),
        overlay: {
            common: _.template($('#template_overlay').html()),
            attention: _.template($('#template_overlay-attention').html())
        }
    },
    initialize: function(data){

        console.log('MENU view init', data, this.el, data.app, data.app.els.page);

        this.model.fetch({
            success: $.proxy(this.modelFetchSuccess, this),
            error: $.proxy(this.modelFetchError, this)
        });

        this.el = $(this.el);
        this.app = data.app;
    },
    modelFetchSuccess: function(){
        this.menu = this.assembleMenu(this.model.get('objects'));
        this.render();
    },
    modelFetchError: function(){
        console.log('MENU model fetch error');
    },
    assembleMenu: function(objects){

        var weekMenu = {},
            categoriesOrder = {
                primary: 0,
                secondary: 1,
                snack: 2,
                dessert: 3,
                misc: 4
            },
            trim = function(str){
                return str
                    .toLowerCase()
                    .replace(/^\s+/, '')
                    .replace(/\s+$/, '')
                    .replace(/\s+/g, ' ');
            };

        _.each(objects, function(day){

            var weekday = config.text.daysRu2En[ trim(day.weekday) ],
                dayMenu = weekMenu[ weekday ] = {
                    providers: {},
                    date: day.date
                };

            _.each(day.providers, function(categories, provider){

                var providerMenu = dayMenu.providers[provider] = {};

                _.each(categories, function(dishes, category){

                    var categoryName = config.text.categoriesRu2En[ trim(category) ],
                        categoryMenu = providerMenu[categoryName] = {
                            name:   config.text.categoriesEn2Ru[categoryName],
                            order:  categoriesOrder[categoryName],
                            dishes: dishes
                        };

                });
            });
        });

        return weekMenu;

    },
    correctOptions: function(options){

        var menu = this.menu,
            order = [
                'monday',
                'tuesday',
                'wednesday',
                'thursday',
                'friday',
                'saturday',
                'sunday'
            ],
            defaults = {
                day: options.day || 'monday',
                provider: options.provider || ''
            },
            check = function(){

                if ( menu[defaults.day] && menu[defaults.day].providers[defaults.provider] ) {
                    return;
                }
                else {

                    if ( menu[defaults.day] ) {
                        if ( !menu[defaults.day].providers[defaults.provider] ) {
                            for ( var provider in menu[defaults.day].providers ) {
                                defaults.provider = provider;
                                break;
                            }
                        }
                    }
                    else {
                        for ( var i = 0, l = order.length; i < l; i++ ) {
                            if ( menu[order[i]] ) {
                                defaults.day = order[i];
                                break;
                            }
                        }
                    }

                    check();
                }
            };

        check();

        return defaults;

    },
    getMenuHTML: function(menu, order, options){

        var menuArr = [],
            menuHTML = [];

        _.each(menu[options.day].providers[options.provider], function(item){
            menuArr.push(item);
        });

        menuArr.sort(function(a,b){
            return a.order < b.order ? -1 : 1;
        });


        console.log('-- getMenuHTML', menuArr);

        _.each(menuArr, function(items){

            var groupHTML = [];

            _.each(items.dishes, function(dish){ // TODO: get order

                if ( !_.isEmpty(order) && order[options.date] && order[options.date].dishes[dish.id] ) {
                    dish.isSelected = this.order[options.date].dishes[dish.id];
                    dish.count = this.order[options.date].dishes[dish.id];
                }

                groupHTML.push(this.templates.item(dish));

            }, this);

            menuHTML.push(this.templates.group({
                name: items.name,
                order: items.order,
                items: groupHTML.join('')
            }));

        }, this);

        return menuHTML.join('');

    },
    render: function(params){

        if ( !this.menu || _.isEmpty(this.menu) ) return;

        console.log('MENU view render:', this.menu, this.el, _.clone(this.app.options), _.clone(params));

        this.app.header.bindDayEvents(this.menu);


//        var currentOptions;
//
//
//        if ( params && params.options ) {
//            currentOptions = params.options
//            console.log('-- params exist');
//        }
//        else {
//
//            if ( this.app && this.app.options ) {
//                currentOptions = this.app.options;
//                console.log('-- this app exists');
//            }
//            else {
//                currentOptions = {};
//                console.log('-- options don\'t exist');
//            }
//        }
//        console.log('-- finally: options =', _.clone(currentOptions));



        var _this = this,
            currentOptions = params && params.options // TODO: fix
                    ? params.options
                    : this.app && this.app.options
                        ? this.app.options
                        : {},
            options = {
                day: currentOptions.day || this.app.els.content.data('menu-day'),
                provider: currentOptions.provider || this.app.els.content.data('menu-provider')
            },
            corrected = this.correctOptions(options),
            isDayCorrect = options.day && options.day === corrected.day,
            isProviderCorrect = options.provider && options.provider === corrected.provider;


        if ( !isDayCorrect ) options.day = corrected.day;
        if ( !isProviderCorrect ) options.provider = corrected.provider;

        if ( ( !isDayCorrect || !isProviderCorrect || !currentOptions.day || !currentOptions.provider ) && !currentOptions.overlayType ) {
            console.log('options INCORRECT:', options.day, options.provider, '\n\n');
            document.location.hash = '#/menu/' + options.day + '/' + options.provider + '/';
            return;
        }
        else {
            console.log('options CORRECT:', options.day, options.provider, '\n\n');
        }

        options.date = this.menu[options.day].date;

        this.app.header.renderProviders(this.menu, options.day, options.provider);
        this.app.header.toggleDay(options.day);

        this.el.data({ 'menu-day': options.day });
        this.el.data({ 'menu-date': options.date });
        this.el.data({ 'menu-provider': options.provider });

        this.app.resetPage();

        this.el
            .empty()
            .append(this.getMenuHTML(this.menu, this.order, options))
            .hide()
            .fadeIn();


        if ( currentOptions.overlayType ) {
            this.renderOverlay({
                date: options.date,
                day: options.day,
                overlayType: currentOptions.overlayType
            });
        }

        setTimeout(function(){
            _this.bindEventsForOrder.call(_this, options.date);
        }, 0);

    },
    bindEventsForOrder: function(date){


//        this.els.header.dayRestaurant = $(config.selectors.header.dayRestaurant);
//        this.els.header.daySlimming = $(config.selectors.header.daySlimming);
//        this.els.header.dayControls = this.els.header.dayRestaurant.add(this.els.header.daySlimming);

        this.els.item = $(config.selectors.menu.item.container);
        this.els.plus = $(config.selectors.menu.item.plus);
        this.els.minus = $(config.selectors.menu.item.minus);
        this.els.countControls = this.els.plus.add(this.els.minus);


//        this.els.header.dayControls.click($.proxy(function(){
//
//            var button = $(event.currentTarget),
//                container = button.parents(config.selectors.header.day),
//                options = {
//                    day: container.attr('rel'),
//                    date: container.data('date'),
//                    type: button.data('type')
//                };
//
//            this.renderOverlay({
//                day: options.day,
//                date: options.date,
//                type: options.type
//            });
//
//            if ( !this.order[options.date] ) {
//                this.order[options.date] = {
//                    dishes: {},
//                    restaurant: false,
//                    none: true
//                };
//            }
//
//            if ( options.type === 'restaurant' ) {
//                this.order[options.date].restaurant = true;
//                this.order[options.date].none = false;
//                this.order[options.date].dishes = {};
//            }
//
//            if ( options.type === 'slimming' ) {
//                this.order[options.date].restaurant = false;
//                this.order[options.date].none = true;
//                this.order[options.date].dishes = {};
//            }
//
//        }, this));


        this.els.item.click($.proxy(function(event){

            var selected = config.classes.menu.selected,
                els = {},
                id;

            els.dish = $(event.currentTarget);
            els.container = els.dish.parents(config.selectors.menu.item.container);
            id = els.container.data('id');

            if ( !this.order[date] ) {
                this.order[date] = {
                    dishes: {},
                    restaurant: false,
                    none: false
                };
            }

            if ( els.container.hasClass(selected) ) {
                delete this.order[date].dishes[id];
                els.container.removeClass(selected);
            }
            else {
                this.order[date].dishes[id] = 1;
                els.container.addClass(selected);
            }

        }, this));


        this.els.countControls.click($.proxy(function(event){

            var els = {},
                count = {},
                id;

            els.button = $(event.currentTarget);
            els.container = els.button.parents(config.selectors.menu.item.container);
            els.count = els.container.find(config.selectors.menu.item.count);
            els.number = els.count.find(config.selectors.menu.item.number);
            id = els.container.data('id');

            count.original = +els.number.html() || 1;
            count.increment = count.original < 9 ? count.original + 1 : 9;
            count.decrement = count.original > 1 ? count.original - 1 : 1;
            count.changed = els.button.is(config.selectors.menu.item.plus)
                ? count.increment
                : count.decrement;

            if ( !this.order[date] ) {
                this.order[date] = {
                    dishes: {},
                    restaurant: false,
                    none: false
                };
            }

            this.order[date].dishes[id] = count.changed;

            count.changed > 1
                ? els.count.removeClass(config.classes.menu.countOne)
                : els.count.addClass(config.classes.menu.countOne);

            els.number.html(count.changed);

        }, this));

    },
    renderOverlay: function(options){

        var content,
            template = this.templates.overlay.common,
            text = {
                start: {
                    message: 'Начните ',
                    days: config.text.daysEn2RuInflect2
                },
                none: {
                    message: 'Худею ',
                    link: {
                        href: 'http://ru.wikipedia.org/wiki/Диета',
                        text: 'Худейте правильно!'
                    },
                    days: config.text.daysEn2RuInflect1
                },
                restaurant: {
                    message: 'Луч гламура ',
                    link: {
                        href: 'http://goo.gl/KU6eY',
                        text: 'Где это клёвое место?'
                    },
                    days: config.text.daysEn2RuInflect1
                },
                attention: {
                    message: 'Ахтунг!'
                }
            };


//        TODO: set to order
//
//        if ( !this.order[options.date] ) {
//            this.order[options.date] = {
//                dishes: {},
//                restaurant: false,
//                none: true
//            };
//        }
//
//        this.order[options.date].restaurant = false;
//        this.order[options.date].none = false;
//        this.order[options.date].dishes = {};
//        this.order[options.date][options.overlayType] = true;


        if ( !options.overlayType || !options.day ) { // TODO: don't forget attention overlay
            alert('overlay error');
            return;
        }


        content = {
            className: config.classes.overlay[options.overlayType][ options.day === 'week' ? 'week' : 'day' ],
            message: text[options.overlayType].message + text[options.overlayType].days[options.day],
            link: {
                href: text[options.overlayType].link.href,
                text: text[options.overlayType].link.text
            }
        };


        if ( options.overlayType === 'attention' ) {

            template = this.templates.overlay.attention;
            content = {
                className: config.classes.overlay.attention,
                message: text.attention.message
            };
        }

        this.app.header.disableProviders();

        this.el
            .find(config.selectors.overlay)
            .remove()
            .end()
            .append(template(content));

    }
});








var OrderView = Backbone.View.extend({
    els: {},
    templates: {
        dishes: _.template($('#template_order-group-dishes').html()),
        message: _.template($('#template_order-group-message').html()),
        item: _.template($('#template_menu-item').html())
    },
    initialize: function(data){

        console.log('ORDER view initialize', this.model, this.model.get('objects'));

        this.model.fetch({
            success: $.proxy(this.modelFetchSuccess, this),
            error: $.proxy(this.modelFetchError, this)
        });

        this.app = data.app;
        this.el = $(this.el);
    },
    modelFetchSuccess: function(){

        var mock = {

            '2012-05-22': {
                dishes: {
                    21: 1,
                    7: 2,
                    56: 1,
                    89: 1
                },
                restaurant: false,
                none: false
            },
            '2012-05-23': {
                dishes: {
                    21: 1,
                    7: 2,
                    56: 1,
                    89: 1
                },
                restaurant: false,
                none: false
            },
            '2012-05-24': {
                dishes: {},
                restaurant: true,
                none: false
            },
            '2012-05-25': {
                restaurant: false,
                none: true
            },
            '2012-05-26': {
                dishes: {
                    21: 1,
                    7: 2,
                    56: 1,
                    89: 1
                },
                restaurant: false,
                none: false
            }
        };

        var menu = this.app.menu.menu;

        if ( !this.app.menu.menu || _.isEmpty(this.app.menu.menu) ) {
            console.warn('--- no menu!');
            // model fetch
            //menu = ''
        }

        //this.order = this.assembleOrder(this.model.get('objects'), menu);
        this.order = this.assembleOrder(mock, menu);
        this.render();

    },
    modelFetchError: function(){
        console.log('ORDER model fetch error');
    },
    assembleOrder: function(objects, menu){

        var order = [],
            days = {};

        _.each(menu, function(data, day){
            days[data.date] = day;
        });

        _.each(objects, function(data, date){
            data.date = date;
            data.weekday = days[date];
            order.push(data);
        });

        //order.sort(fun);

        return order;

    },
    render: function(){

//        $.ajax({
//            url: '/api/v1/order/',
//            method: 'POST',
//            contentType: 'application/json',
//            data: { '2012-06-01': { 'dishes': { 720: 1, 721: 1, 722: 1, 723: 1, 673: 1 } } },
//            success: function(data){
//                console.log('SUCCESS:', data);
//            },
//            error: function(error){
//                console.log('ERROR:', error);
//            }
//        });



//
//
//
//        return;
//
//        console.log('ORDER view render');
//
//        if ( !this.order || _.isEmpty(this.order) ) return; // ??? this.order.length
//
//
//
//        return;
//




        if ( !this.order ) return;

        var orderHTML = [];


        _.each(this.order, function(data){

            var dayHTML = [],
                hasDishes = !data.restaurant && !data.none,
                template,
                content;

            _.each(data.items, function(item){
                dayHTML.push(this.templates.item(item));
            }, this);

            if ( hasDishes ) {

                template = this.templates.dishes;
                content = {
                    date: data.date,
                    day: config.text.daysEn2Ru[data.weekday].capitalize(),
                    price: '400',       
                    dishes: dayHTML.join('')
                };
            }
            else {

                var className = data.restaurant
                        ? config.classes.order.restaurant
                        : data.none
                            ? config.classes.order.none
                            : '',
                    message = data.restaurant
                        ? 'Луч гламура '
                        : data.none
                            ? 'Худею '
                            : '';

                template = this.templates.message;
                content = {
                    date: data.date,
                    day: config.text.daysEn2Ru[data.weekday],
                    message: message + config.text.daysEn2RuInflect1[data.weekday],
                    className: className
                };
            }

            orderHTML.push(template(content));

        }, this);
        

        this.app.resetPage();

        this.el
            .empty()
            .addClass(config.classes.content.order)
            .html(orderHTML.join(''))
            .hide()
            .fadeIn();

        this.app.els.page.addClass(config.classes.page.order);


        return;








        /***************/

        var menu = {},
            dates = {},
            orderObj = {},
            orderArr = [],
            orderHTML = [];


        _.each(this.menu, $.proxy(function(dayMenu, day){
            menu[dayMenu.date] = {
                providers: dayMenu.providers,
                weekday: day
            };
        }, this));


        _.each(this.order, $.proxy(function(dayOrder, dateStr){

            var weekday = menu[dateStr].weekday,
                dateArr = dateStr.split('-'),
                date = new Date(+dateArr[0], +dateArr[1] - 1, +dateArr[2]),
                createItem = function(){
                    if ( !orderObj[weekday] ) {
                        orderObj[weekday] = {
                            order: +date,
                            date: dateStr,
                            weekday: weekday,
                            dishes: [],
                            restaurant: dayOrder.restaurant
                        };
                    }
                };

            if ( dayOrder.restaurant ) {
                createItem();
            }

            _.each(menu[dateStr].providers, $.proxy(function(categories, provider){

                _.each(categories, $.proxy(function(categoryData, category){

                    _.each(categoryData.dishes, $.proxy(function(dish){

                        if ( this.order[dateStr].dishes[dish.id] ) {

                            var extendedDish = {
                                id: dish.id,
                                name: dish.name,
                                price: dish.price,
                                weight: dish.weight,
                                provider: provider,
                                category: config.text.categoriesEn2Ru[category]
                            };

                            createItem();
                            orderObj[weekday].dishes.push(extendedDish);
                        }
                    }, this));
                }, this));
            }, this));
        }, this));


        this.els.header.day
            .not('.'+config.classes.header.dayInactive)
            .each(function(i, element){

                var day = $(element),
                    dateStr = day.data('date'),
                    weekday = day.attr('rel'),
                    dateArr = dateStr.split('-');

                dates[weekday] = {
                    order: +new Date(+dateArr[0], +dateArr[1] - 1, +dateArr[2]),
                    date: dateStr,
                    weekday: weekday,
                    dishes: [],
                    restaurant: null
                };
            });

        _.each(dates, $.proxy(function(dateData, weekday){
            if ( !orderObj[weekday] ) {
                orderObj[weekday] = dates[weekday];
            }
        }, this));


        _.each(orderObj, function(dayData, day){
            orderArr.push(dayData);
        });


        orderArr.sort(function(a, b){
            return a.order < b.order ? -1 : 1;
        });

        _.each(orderArr, $.proxy(function(dayOrder){

            var dayHTML = [],
                dayPrice = 0,
                template,
                content;

            _.each(dayOrder.dishes, $.proxy(function(dish){
                dayPrice += +dish.price;
                dayHTML.push(this.templates.order.item(dish));
            }, this));


            template = this.templates.order.group.dishes,
            content = {
                date: dayOrder.date,
                day: config.text.daysEn2Ru[dayOrder.weekday].capitalize(),
                price: dayPrice,
                dishes: dayHTML.join('')
            };


            if ( !dayHTML.length && !dayOrder.restaurant ) {

                template = this.templates.order.group.message;
                content = {
                    date: dayOrder.date,
                    day: config.text.daysRu2En[dayOrder.weekday].capitalize(),
                    className: config.classes.order.slimming,
                    message: 'Худею ' + config.text.daysEn2RuInflect1[dayOrder.weekday]
                };
            }

            if ( dayOrder.restaurant ) {
                template = this.templates.order.group.message;
                content = {
                    date: dayOrder.date,
                    day: config.text.daysRu2En[dayOrder.weekday].capitalize(),
                    className: config.classes.order.restaurant,
                    message: 'Луч гламура ' + config.text.daysEn2RuInflect1[dayOrder.weekday]
                };
            }

            orderHTML.push(template(content));

        }, this));


        this.resetPage();

        this.els.content.wrapper
            .empty()
            .addClass(config.classes.content.order)
            .html(orderHTML.join(''))
            .hide()
            .fadeIn();

        this.els.page.addClass(config.classes.page.order);
    }
});

















var FavouritesView = Backbone.View.extend({
    els: {},
    templates: {
        container: _.template($('#template_favourites').html()),
        category: _.template($('#template_favourites-category').html()),
        item: _.template($('#template_favourites-item').html())
    },
    initialize: function(data){

        console.log('FAVOURITES view initialize', this.model, this.model.get('objects'));

        this.model.fetch({
            success: $.proxy(this.modelFetchSuccess, this),
            error: $.proxy(this.modelFetchError, this)
        });

        this.app = data.app;
        this.el = $(this.el);
    },
    modelFetchSuccess: function(){

        this.model.get('objects')[0].favorite = true;
        this.model.get('objects')[3].favorite = true;
        this.model.get('objects')[7].favorite = true;
        this.model.get('objects')[13].favorite = true;
        this.model.get('objects')[18].favorite = true;

        this.favourites = this.assertFavourites(this.model.get('objects'));
        this.render();
    },
    modelFetchError: function(){
        console.log('FAVOURITES model fetch error');
    },
    assertFavourites: function(objects){

        var favourites = {};

        _.each(objects, function(dish){

            var category = config.text.categoriesRu2En[dish.group];

            if ( !favourites[category] ) {
                favourites[category] = {
                    name: config.text.categoriesEn2RuShort[category],
                    dishes: []
                };
            }

            favourites[category].dishes.push(dish);

        });

        return favourites;
    },
    render: function(){

        if ( !this.favourites ) return;

        var _this = this,
            favouritesHTML = [];

        _.each(this.favourites, function(data, category){

            var categoryHTML = [];

            _.each(data.dishes, function(dish){
                categoryHTML.push(this.templates.item({
                    name: dish.title,
                    provider: dish.provider,
                    id: dish.id,
                    isSelected: dish.favorite
                }));
            }, this);

            favouritesHTML.push(this.templates.category({
                name: data.name,
                category: category,
                items: categoryHTML.join('')
            }));

        }, this);


        this.app.resetPage();

        this.el
            .empty()
            .addClass(config.classes.content.favourites)
            .append(this.templates.container({ categories: favouritesHTML.join('') }))
            .hide()
            .fadeIn();

        this.app.els.page.addClass(config.classes.page.favourites);

        setTimeout(function(){
            _this.bindEvents();
        }, 0);

    },
    bindEvents: function(){

        this.els.item = $(config.selectors.favourites.item);
        this.els.item.click($.proxy(function(event){

            var element = $(event.currentTarget),
                id = element.data('id'),
                selected = element.hasClass(config.classes.favourites.selected);

            if ( selected ) {
                element.removeClass(config.classes.favourites.selected);

                // model set
            }
            else {
                element.addClass(config.classes.favourites.selected);

                // model set
            }

        }, this));

    }
});
