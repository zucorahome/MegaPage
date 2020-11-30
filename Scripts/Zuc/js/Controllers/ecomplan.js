/*

    ecomplan Controller for the View "ecomplan"
    Copyright 2018, LimeTAC Inc. All rights reserved.

*/

(function () {

    LT.EcomPlan = {};

    function FlyIn(Config) {

        var It = this;

        if (Config && Config.Title && Config.Content && Config.DoneButtonText) {

            if (!Config.CloseButtonText) Config.CloseButtonText = 'Close';

            It.Elem =
                $('<div class="ModalWrapper IEBoxModel">'
                    + '<div class="FlyIn IEBoxModel">'
                        + '<h1 class="Title">' + Config.Title + '</h1>'
                        + (Config.Subtitle ? '<h4 class="Description">' + Config.Subtitle + '</h4>' : '')
                        + Config.Content
                        + '<div class="ButtonStrip">'
                            + '<button class="zuc-btn zuc-btn-primary Close">' + Config.CloseButtonText + '</button>'
                            + '<button class="zuc-btn zuc-btn-secondary Done">' + Config.DoneButtonText + '</button>'
                        + '</div>'
                    + '</div>'
                + '</div>')
                    .appendTo('body');

            It.Decommission = function () {
                if (Config.CloseCallback) {
                    Config.CloseCallback(It);
                }
                It.Elem.remove();
            };

            It.Elem.find('.Done, .Close').on('click', function () {
                if ($(this).is('.Done')) {
                    if (Config.DoneCallback) {
                        Config.DoneCallback(It);
                    }
                }
                It.Decommission();
            });

            if (Config.ShowCallback) {
                Config.ShowCallback(It);
            }

        } else {

            throw new Error('Please provide required parameters when initialising.');

        }

        return It;

    }

    var NumberScroller = function () {
        $(document).on('click', '.NumberScroller i', function (E) {
            var Input = $(this).siblings('input');
            var Val = parseInt(Input.val() || 0, 10);
            if ($(this).is(':first-child')) { // minus
                var NewVal = Val - 1;
                var Min = Input.attr('data-lt-min');
                Input.val(NewVal >= Min ? NewVal : Min);
            } else { // add
                var NewVal = Val + 1;
                var Max = Input.attr('data-lt-max');
                if (!U.IsNumber(Max)) Max = Infinity;
                Input.val(NewVal <= Max ? NewVal : Val);
            }
            Input.trigger('change');
        });
        $(document).on('change', '.NumberScroller input', function () {
            var Val = $(this).val();
            if (U.IsNumber(Val)) {
                var Min = $(this).attr('data-lt-min');
                var Max = $(this).attr('data-lt-max');
                if (!U.IsNumber(Max)) Max = Infinity;
                if (Val < Min || Val > Max) {
                    $(this).val(0);
                }
                if ($(this).val() % 0 != 0) {
                    $(this).val(parseInt($(this).val(), 10));
                }
            } else {
                $(this).val(0);
            }
        });
        return function (Config) {

            if (!Config) Config = {};

            if (true) {

                var Id = Config.Id || U.GetRandomString(35);
                var Val = Config.DefaultValue || 0;
                var Min = Config.Minimum || 0;

                return '<div class="NumberScroller' + (!Config.Label ? ' NoLabel' : '') + '"'
                    + (typeof Config.CustomContainerAttributes != 'undefined' ? ' ' + Config.CustomContainerAttributes : '') + '>'
                    + (Config.Label ? '<label class="IEBoxModel" for="' + Id + '">' + Config.Label + '</label>' : '')
                    + '<span' + (!Config.Label ? ' class="ClearFixGroup"' : '') + '>'
                        + '<i>-</i>'
                        + '<input id="' + Id + '" type="text" data-lt-min="' + Min + '"' + (Config.Maximum ? ' data-lt-max="' + Config.Maximum + '"' : '') + ' value="' + Val + '" />'
                        + '<i>+</i>'
                    + '</span>'
                + '</div>';

            } else {

                throw new Error('Please provide all required paramters when initialising.');

            }

        };
    }();

    var U = new LTPublicUtils();

    LT.EcomPlan.RequestedItemCode = U.GetURIParam('i');

    var BasePlansPromise =
        $.when(
            LT.LTCodes.Find('ItemTypes', 'name', 'Service'),
            LT.LTCodes.Find('ItemTypes', 'name', 'Combo Plans')
        ).then(function (ServiceItemType, ComboPlansItemType) {
            return U.AJAX('/API/Inventory/ItemsExt?$filter=itemTypeId eq ' + ServiceItemType.id + ' and containerTypeId ne ' + ComboPlansItemType.id + ' and hasLabel eq true', 'GET', false, false, 'silent')
                .then(function (Result) {
                    return Result.items.sort(function (A, B) {
                        return A.msrp > B.msrp
                            ? 1
                            : A.msrp < B.msrp
                                ? -1
                                : A.code > B.code
                                    ? 1
                                    : A.code < B.code
                                        ? -1
                                        : 0;
                    }).map(function (Ix) {
                        Ix['DetailItems'] = Ix.details.split('\n').map(function (D) {
                            return D.split('|')[1];
                        });
                        Ix['AvailableToUser'] = ko.observable(false);
                        return Ix;
                    });
                });
        });
    var ComboPlansPromise =
        $.when(
            LT.LTCodes.Find('ItemTypes', 'name', 'Service'),
            LT.LTCodes.Find('ItemTypes', 'name', 'Combo Plans')
        ).then(function (ServiceItemType, ComboPlansItemType) {
            return U.AJAX('/API/Inventory/ItemsExt?$filter=itemTypeId eq ' + ServiceItemType.id + ' and containerTypeId eq ' + ComboPlansItemType.id + ' and hasLabel eq true', 'GET', false, false, 'silent')
                .then(function (Result) {
                    return Result.items.map(function (Ix) {
                        Ix['IncludedBasePlans'] = Ix.details.split('\n').sort();
                        return Ix;
                    });
                });
        });
    var AppConfigPromise =
        U.AJAX("/API/Core/ApplicationConfigsExt?$filter=name eq 'RewardPointsSettings' or name eq 'PlanExclusionsByProvince'", 'GET', false, false, 'silent')
            .then(function (R) {
                var RPVal = (R.items.find(function (X) { return X.name == 'RewardPointsSettings' }) || { value: null }).value;
                return {
                    PlanExclusionsByProvince:
                        JSON.parse(
                            (
                                R.items.find(function (X) { return X.name == 'PlanExclusionsByProvince' })
                                || { value: '{}' }
                            ).value.replace(/\r|\n|\t/g, '')
                        ),
                    RewardPointsSettings: RPVal ? RPVal.split('|') : [],
                };
            });
    var SinglePlansPromise =
        LTAppSettingUserIsSignedIn
            ? $.when(
                LT.LTCodes.Find('ItemTypes', 'name', 'Service'),
                LT.LTCodes.Find('ItemTypes', 'name', 'Combo Plans')
            ).then(function (ServiceItemType, ComboPlansItemType) {
                return U.AJAX('/API/Inventory/ItemsExt?$filter=itemTypeId eq ' + ServiceItemType.id + ' and containerTypeId ne ' + ComboPlansItemType.id + ' and hasLabel eq false', 'GET', false, false, 'silent')
                    .then(function (Result) {
                        Result.items.forEach(function (SP) {
                            SP['Quantity'] = ko.observable(0);
                        });
                        return Result.items.sort(function (A, B) {
                            return A.code > B.code ? 1 : A.code < B.code ? -1 : 0;
                        });
                    });
            })
            : new $.Deferred().resolve([]);
    var ApplicationOwnerPromise =
        LTAppSettingUserIsSignedIn
            ? U.AJAX('/API/Core/GetApplicationOwner', 'GET', false, false, 'silent')
                .then(function (Result) {
                    return U.AJAX('/API/Core/Affiliates?$filter=id eq ' + Result.id, 'GET', false, false, 'silent');
                })
                .then(function (Result) {
                    return Result.items[0];
                })
            : new $.Deferred().resolve({});
    LT.EcomPlan.ProvincePromise =
        LT.LTCodes.Get('CanadianProvinceList');

    $(function () {
        var VM = function () {

            var VM = this;

            VM.PrepMoneyForMath = U.PrepMoneyForMath;
            VM.PrepMathForView = U.PrepMathForView;

            VM.Provinces = ko.observableArray([]);
            LT.EcomPlan.ProvincePromise.done(function (R) {
                VM.Provinces(R.sort(function (A, B) {
                    var AU = A.code.toUpperCase(),
                        BU = B.code.toUpperCase();
                    return AU > BU ? 1 : AU < BU ? -1 : 0;
                }));
            });
            VM.PlanExclusionsByProvince = ko.observable({});
            AppConfigPromise.done(function (R) {
                VM.PlanExclusionsByProvince(R.PlanExclusionsByProvince);
            });
            LT.EcomPlan.SetUserProvince = function (ProvinceId) {
                if (U.IsNumber(ProvinceId) && VM.Provinces().find(function (P) { return P.id == ProvinceId })) {
                    VM.UserProvince(parseInt(ProvinceId, 10));
                }
            };
            VM.UserProvince = ko.observable(null);
            VM.UserProvince.subscribe(function (NewVal) {
                VM.SelectedPlan(null);
                VM.BasePlans().forEach(function (P) {
                    if (NewVal) {
                        var ProvCode = VM.Provinces().find(function (P) { return P.id == NewVal }).code;
                        var PlanExclusions = VM.PlanExclusionsByProvince()[P.code] || [];
                        P.AvailableToUser(PlanExclusions.indexOf(ProvCode) == -1);
                    } else {
                        P.AvailableToUser(false);
                    }
                });
            });

            VM.SinglePlans = ko.observableArray([]);
            VM.BasePlans = ko.observableArray([]);
            VM.ComboPlans = ko.observableArray([]);
            LT.EcomPlan.CheckComboPlanAvailability = function (ComboPlanCode, SelectIfAvailable) {
                var TargetPlan = VM.BasePlans().concat(VM.ComboPlans()).find(function (P) { return P.code == ComboPlanCode; });
                if (TargetPlan) {
                    var TargetPlanAvailableToUser = TargetPlan.IncludedBasePlans
                        ? TargetPlan.IncludedBasePlans.every(function (Code) { return VM.BasePlans().find(function (P) { return P.code == Code; }).AvailableToUser(); })
                        : VM.BasePlans().find(function (P) { return P.code == TargetPlan.code; }).AvailableToUser();
                    if (TargetPlanAvailableToUser && SelectIfAvailable) {
                        VM.SelectedPlan(TargetPlan);
                    }
                    return TargetPlanAvailableToUser;
                }
                return null;
            };
            VM.SelectedPlan = ko.observable(null);
            VM.CoveredBasePlans = ko.computed(function () {
                var SP = VM.SelectedPlan();
                if (SP) {
                    var IBPs = [];
                    if (SP.IncludedBasePlans instanceof Array) {
                        SP.IncludedBasePlans.forEach(function (Code) {
                            IBPs.push(VM.BasePlans().find(function (BP) { return BP.code == Code; }));
                        });
                    } else {
                        IBPs.push(SP);
                    }
                    return IBPs.sort(function (A, B) {
                        return A.code > B.code ? 1 : A.code < B.code ? -1 : 0;
                    });
                }
                return [];
            });
            VM.ToggleBasePlan = function (BasePlan) {
                VM.SinglePlans().forEach(function (SP) {
                    if (SP.containerTypeId == BasePlan.containerTypeId) {
                        SP.Quantity(0);
                    }
                });
                var DesiredCoverage = VM.CoveredBasePlans().indexOf(BasePlan) < 0
                    ? VM.CoveredBasePlans().concat([BasePlan]).map(function (P) { return P.code; }).sort() // cover
                    : VM.CoveredBasePlans().map(function (P) { return P.code; }).filter(function (Code) { return Code != BasePlan.code; }); // decover
                var NewPlan = DesiredCoverage.length > 1
                    ? VM.ComboPlans().find(function (CP) {
                        return CP.IncludedBasePlans.sort().join(',') === DesiredCoverage.join(',');
                    })
                    : VM.BasePlans().find(function (BP) {
                        return BP.code == DesiredCoverage[0];
                    });
                VM.SelectedPlan(NewPlan);
            };
            VM.Discount = ko.computed(function () {
                var SP = VM.SelectedPlan();
                var CBPs = VM.CoveredBasePlans();
                if (SP && CBPs.length > 1) {
                    var BPCost = CBPs.reduce(function (Acc, P) { return Acc + U.PrepMoneyForMath(P.msrp); }, 0);
                    var SPCost = U.PrepMoneyForMath(SP.msrp);
                    return parseFloat(Math.ceil(U.PrepMathForView(BPCost - SPCost)));
                }
                return 0;
            });
            VM.RewardsPercentage = ko.observable(null);
            VM.Rewards = ko.computed(function () {
                var SP = VM.SelectedPlan();
                return SP
                    ? parseFloat(
                        U.PrepMathForView(
                            U.PrepMoneyForMath(SP.msrp) * U.PrepMoneyForMath(VM.RewardsPercentage()),
                            1
                        )
                    )
                    : 0;
            });
            VM.PointsFactor = ko.observable(null);
            VM.Points = ko.computed(function () {
                return Math.round(
                    U.PrepMathForView(
                        U.PrepMoneyForMath(VM.Rewards()) * U.PrepMoneyForMath(VM.PointsFactor()),
                        1
                    )
                );
            });

            VM.Step = ko.computed(function () {
                return 1 + VM.CoveredBasePlans().length;
            });
            VM.StepLabel = ko.computed(function () {
                return 'Step ' + VM.Step();
            });
            VM.StepTitle = ko.computed(function () {
                if (!VM.UserProvince()) {
                    return 'Choose Your Province to Begin';
                }
                var S = VM.Step();
                if (S == 1) {
                    return 'Choose your Smarter Living Plan:';
                } else if (S == 2) {
                    return 'Make it a Combo:';
                } else if (S == 3) {
                    return 'Complete your bundle:';
                } else if (S == 4) {
                    return 'Complete your purchase:';
                }
            });

            VM.AddToCart = function (ignore, E, CheckOut) {
                var Item = VM.SelectedPlan();
                var AddPromises = [LT.Cart.AddItem(Item.id, 1, Item.itemTypeId)];
                VM.SinglePlans().forEach(function (SP) {
                    if (SP.Quantity() > 0) {
                        AddPromises.push(
                            LT.Cart.AddItem(SP.id, SP.Quantity(), SP.itemTypeId)
                        );
                    }
                });
                $.when.apply(null, AddPromises).done(function () {
                    if (LTAppSettingUserIsSignedIn) {
                        window.location.href = '/Zuc/ecomcheckout';
                    } else {
                        window.location.href = CheckOut ? '/Zuc/ecomcart' : '/Zuc/ecomhome';
                    }
                });
            };
            VM.DowngradeToSinglePlan = function (BasePlan, E) {
                E.stopImmediatePropagation();
                LT.LTCodes.Find('ItemTypes', 'id', BasePlan.containerTypeId).done(function (BPContType) {
                    new FlyIn({
                        Title: BPContType.name,
                        Subtitle: 'Select the item(s) you want to cover',
                        Content:
                            '<div class="Inputs">'
                                + VM.SinglePlans().reduce(function (A, SP) {
                                    return SP.containerTypeId == BPContType.id
                                        ? A + NumberScroller({
                                            Minimum: 0,
                                            Label: SP.code,
                                            DefaultValue: SP.Quantity(),
                                            CustomContainerAttributes: 'data-lt-plan-id="' + SP.id + '"',
                                        })
                                        : A;
                                }, '')
                            + '</div>',
                        DoneButtonText: 'Select',
                        DoneCallback: function (FI) {
                            // unselect base plan, if necessary
                            if (VM.CoveredBasePlans().indexOf(BasePlan) > -1) {
                                VM.ToggleBasePlan(BasePlan);
                            }
                            // maintain single plan quantities
                            $('.NumberScroller', FI.Elem).each(function () {
                                var Val = parseInt($(this).find('input').val(), 10);
                                var ItemId = $(this).attr('data-lt-plan-id');
                                var Item = VM.SinglePlans().find(function (SP) { return SP.id == ItemId; });
                                Item.Quantity(Val);
                            });
                        },
                    });
                });
            };
            VM.PlayBasePlanVideo = function () {
                var CloseLearnMore = $.noop;
                $(document).on('keyup', function (E) {
                    if (E.which == 27) { // [Esc]
                        CloseLearnMore();
                    }
                });
                return function (BP, E) {
                    var Att = BP.attachments.find(function (AX) { return AX.address.split('.').pop().toUpperCase() == 'MP4'; });
                    if (Att) {
                        var VidCont =
                            $('<div class="LearnMoreWrapper FlexContainer FlexCentreAll">'
                                + '<div class="LearnMoreContainer Invisible">'
                                    + '<video class="LearnMoreVideo" src="' + Att.address + '" controls autoplay preload="auto"></video>'
                                    + '<span class="CloseLearnMore"></span>'
                                + '</div>'
                            + '</div>')
                                .appendTo('body');
                        setTimeout(function () { VidCont.find('.Invisible').removeClass('Invisible'); });
                        CloseLearnMore = function () {
                            VidCont.find('video')[0].pause();
                            VidCont.addClass('Done');
                            setTimeout(function () { VidCont.remove(); }, 600);
                            CloseLearnMore = $.noop;
                        };
                        VidCont.on('click', '.CloseLearnMore', function () {
                            CloseLearnMore();
                        });
                    }
                    E.stopImmediatePropagation();
                };
            }();

            return VM;

        }();
        // set up breadcrumbs
        $('.zuc-ec-breadcrumbs').children().not(':eq(0), :eq(1), :eq(6)').remove();
        $('.zuc-ec-breadcrumbs').children(':eq(0)').attr('href', '/Zuc/ecomhome');
        $('.zuc-ec-breadcrumbs').children(':eq(2)').text('Smarter Living Plans');
        // ingest plans
        $.when(
            BasePlansPromise,
            ComboPlansPromise,
            AppConfigPromise,
            SinglePlansPromise,
            ApplicationOwnerPromise
        ).done(function (BasePlans, ComboPlans, AppConfig, SinglePlans, AO) {
            VM.SinglePlans(SinglePlans);
            VM.BasePlans(BasePlans);
            VM.ComboPlans(ComboPlans);
            VM.RewardsPercentage(parseFloat(AppConfig.RewardPointsSettings[3]) || 0.01);
            VM.PointsFactor(parseFloat(AppConfig.RewardPointsSettings[0]) || 1000);
            if (LTAppSettingUserIsSignedIn) {
                LT.Cart.Clear();
                $('body').addClass('SalesFlow');
                var AOIntroVideoURL =
                    AO.attachments.find(function (A) {
                        var Ext = A.address.split('.').pop().toUpperCase();
                        var Name = decodeURIComponent(A.address.split('/').pop());
                        return Ext == 'MP4' && /Cover Intro/.test(Name);
                    }).address;
                var Intro = $('<div class="Intro FullSplash IEBoxModel">'
                    + '<div class="zuc-nav-wrapper">'
                        + '<nav class="zuc-main-nav flex flex-hor-start flex-hor-between flex-vert-center u-uppercase">'
                            + '<a class="zuc-nav-brand" href="/Zuc/ecomplan"><img src="/Images/Zuc/images/ZucoraHome-brand-white.svg"></a>'
                        + '</nav>'
                    + '</div>'
                    + '<div class="Info">'
                        + '<h1>Discover Smarter Living Plans</h1>'
                        + '<video src="' + AOIntroVideoURL + '" controls preload="metadata"></video>'
                    + '</div>'
                    + '<button class="Close zuc-btn zuc-btn-secondary">Next</button>'
                + '</div>').appendTo('body');
                Intro.find('.Close').on('click', function () {
                    Intro.fadeOut(500, function () {
                        $(this).remove();
                    });
                });
                $('.zuc-main-nav').prepend(
                    '<div style="position: absolute; left: 1.5vw;">'
                        + '<a class="ExitSellingModule" href="#" style="width: 24px; height: 24px; display: inline-block;"><img src="/Images/Zuc/images/ecom/private-ecom-go-to-advisor-welcome.png" style="height: 100%;" /></a>'
                        + '<a href="/Zuc/ecomplan" style="width: 24px; height: 24px; display: inline-block; margin-left: 0.7vw;"><img src="/Images/Zuc/images/ecom/private-ecom-restart.png" style="height: 100%;" /></a>'
                    + '</div>'
                );
                $('.ExitSellingModule').on('click', (function () {
                    var EmployeePasscodePromise =
                        U.AJAX("/API/Core/ApplicationConfigs?$filter=name eq 'Cover_Employee Passcode'", 'GET', false, false, 'silent')
                            .then(R => (R && R.items && R.items.length && R.items[0].value) || false);
                    function RequestPassword() {
                        return $.when(EmployeePasscodePromise)
                            .then(function (EmployeePasscode) {
                                var Promise = new $.Deferred();
                                if (EmployeePasscode) { // request passcode from user
                                    prompt('Enter Code') == EmployeePasscode
                                        ? Promise.resolve()
                                        : Promise.reject({ message: 'Wrong Code!' });
                                } else { // EmployeePasscode is not set; exit module without passcode
                                    Promise.resolve();
                                }
                                return Promise;
                            });
                    }
                    return function (E) {
                        E.preventDefault();
                        $.when(RequestPassword()).then(function () {
                            window.location.href =
                                U.UserHasRole('M-Rep Welcome')
                                    ? '/zuc/repwelcome'
                                    : U.UserHasRole('M-Advisor Welcome')
                                        ? '/zuc/advisorwelcome'
                                        : '/zuc/spswelcome';
                        }, function (Resp) {
                            alert(Resp.message);
                        });
                    };
                })());
                $('.zuc-main-nav').append(
                    '<div style="position: absolute; right: 12vw;">'
                        + '<img class="partner_logo" style="height: 40px; vertical-align: middle;" />'
                        + '<span class="username" style="vertical-align: middle; margin-left: 0.5vw;">' + LTAppSettingUserName + '</span>'
                    + '</div>'
                );
                $('.zuc-nav-brand').attr('href', null);
            }
            // bind to data
            ko.applyBindings(VM);
            // auto-select all available plans, if user signed in and no plan was passed as a parameter
            if (LTAppSettingUserIsSignedIn && !VM.SelectedPlan()) {
                $('.zuc-ec-action-zone-info-col').trigger('click');
            }
            U.ShowUI();
        });
        // top sellers
        U.PopulateTopSellers();
    });


})();