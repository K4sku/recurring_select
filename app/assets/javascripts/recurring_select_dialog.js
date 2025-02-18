import { on, off, trigger, css, serialize } from './utils'

export class RecurringSelectDialog {
  constructor(recurring_selector) {
    this.config = this.constructor.config
    this.cancel = this.cancel.bind(this);
    this.outerCancel = this.outerCancel.bind(this);
    this.save = this.save.bind(this);
    this.summaryUpdate = this.summaryUpdate.bind(this);
    this.summaryFetchSuccess = this.summaryFetchSuccess.bind(this);
    this.init_calendar_days = this.init_calendar_days.bind(this);
    this.init_calendar_weeks = this.init_calendar_weeks.bind(this);
    this.toggle_month_view = this.toggle_month_view.bind(this);
    this.freqChanged = this.freqChanged.bind(this);
    this.intervalChanged = this.intervalChanged.bind(this);
    this.daysChanged = this.daysChanged.bind(this);
    this.dateOfMonthChanged = this.dateOfMonthChanged.bind(this);
    this.weekOfMonthChanged = this.weekOfMonthChanged.bind(this);
    this.recurring_selector = recurring_selector;
    this.current_rule = this.recurring_selector.recurring_select('current_rule');
    this.initDialogBox();
    if ((this.current_rule.hash == null) || (this.current_rule.hash.rule_type == null)) {
      this.freqChanged();
    }
  }

  initDialogBox() {
    document.querySelectorAll(".rs_dialog_holder").forEach(el => el.parentNode.removeChild(el))

    const uiPage = document.querySelector('.ui-page-active')
    const anchor = uiPage ? uiPage : document.body

    const div = document.createElement("div")
    div.innerHTML = this.template()
    anchor.appendChild(div.children[0])

    this.outer_holder = document.querySelector(".rs_dialog_holder");
    this.inner_holder = this.outer_holder.querySelector(".rs_dialog");
    this.content = this.outer_holder.querySelector(".rs_dialog_content");

    this.mainEventInit();
    this.freqInit();
    this.summaryInit();
    trigger(this.outer_holder, "recurring_select:dialog_opened");
    this.freq_select.focus();
  }

  cancel() {
    this.outer_holder.remove();
    this.recurring_selector.recurring_select('cancel');
  }

  outerCancel(event) {
    if (event.target.classList.contains("rs_dialog_holder")) {
      this.cancel();
    }
  }

  save() {
    if ((this.current_rule.str == null)) { return; }
    this.outer_holder.remove();
    this.recurring_selector.recurring_select('save', this.current_rule);
  }

// ========================= Init Methods ===============================

  mainEventInit() {
    // Tap hooks are for jQueryMobile
    on(this.outer_holder, 'click tap', this.outerCancel);
    on(this.content, 'click tap', 'h1 a', this.cancel);
    this.save_button = this.content.querySelector('input.rs_save')
    on(this.save_button, "click tap", this.save)
    on(this.content.querySelector('input.rs_cancel'), "click tap", this.cancel)
  }

  freqInit() {
    this.freq_select = this.outer_holder.querySelector(".rs_frequency");
    const rule_type = this.current_rule.hash && this.current_rule.hash.rule_type
    if (this.current_rule.hash != null && rule_type != null) {
      if (rule_type.search(/Weekly/) !== -1) {
        this.freq_select.selectedIndex = 1
        this.initWeeklyOptions();
      } else if (rule_type.search(/Monthly/) !== -1) {
        this.freq_select.selectedIndex = 2
        this.initMonthlyOptions();
      } else if (rule_type.search(/Yearly/) !== -1) {
        this.freq_select.selectedIndex = 3
        this.initYearlyOptions();
      } else {
        this.initDailyOptions();
      }
    }
    on(this.freq_select, "change", this.freqChanged);
  }

  initDailyOptions() {
    const section = this.content.querySelector('.daily_options')
    const interval_input = section.querySelector('.rs_daily_interval')
    interval_input.value = this.current_rule.hash.interval
    on(interval_input, "change keyup", this.intervalChanged);
    section.style.display = 'block'
  }

  initWeeklyOptions() {
    const section = this.content.querySelector('.weekly_options');

    // connect the interval field
    const interval_input = section.querySelector('.rs_weekly_interval');
    interval_input.value = this.current_rule.hash.interval
    on(interval_input, "change keyup", this.intervalChanged);

    // clear selected days
    section.querySelectorAll(".day_holder a").forEach(el =>
      el.classList.remove("selected")
    )

    // connect the day fields
    if ((this.current_rule.hash.validations != null) && (this.current_rule.hash.validations.day != null)) {
      Array.from(this.current_rule.hash.validations.day).forEach((val) =>
        section.querySelector(".day_holder a[data-value='"+val+"']").classList.add("selected")
      )
    }

    off(section, "click")
    on(section, "click", ".day_holder a", this.daysChanged)

    section.style.display = 'block'
  }

  initMonthlyOptions() {
    const section = this.content.querySelector('.monthly_options')
    const interval_input = section.querySelector('.rs_monthly_interval')
    interval_input.value = this.current_rule.hash.interval
    on(interval_input, "change keyup", this.intervalChanged)

    if (!this.current_rule.hash.validations) { this.current_rule.hash.validations = {} };
    if (!this.current_rule.hash.validations.day_of_month) { this.current_rule.hash.validations.day_of_month = [] };
    if (!this.current_rule.hash.validations.day_of_week) { this.current_rule.hash.validations.day_of_week = {} };
    this.init_calendar_days(section);
    this.init_calendar_weeks(section);

    const in_week_mode = Object.keys(this.current_rule.hash.validations.day_of_week).length > 0;
    section.querySelector(".monthly_rule_type_week").checked = in_week_mode
    section.querySelector(".monthly_rule_type_day").checked = !in_week_mode;
    this.toggle_month_view();
    section.querySelectorAll("input[name=monthly_rule_type]").forEach((el) => on(el, "change", this.toggle_month_view))
    section.style.display = 'block'
  }

  initYearlyOptions() {
    const section = this.content.querySelector('.yearly_options');
    const interval_input = section.querySelector('.rs_yearly_interval');
    interval_input.value = this.current_rule.hash.interval
    on(interval_input, "change keyup", this.intervalChanged)
    section.style.display = 'block'
  }


  summaryInit() {
    this.summary = this.outer_holder.querySelector(".rs_summary");
    this.summaryUpdate();
  }

// ========================= render methods ===============================

  summaryUpdate(new_string) {
    // this.summary.style.width = `${this.content.getBoundingClientRect().width}px`;
    if ((this.current_rule.hash != null) && (this.current_rule.str != null)) {
      this.summary.classList.remove("fetching");
      this.save_button.classList.remove("disabled");
      let rule_str = this.current_rule.str.replace("*", "");
      if (rule_str.length < 20) {
        rule_str = `${this.config.texts["summary"]}: `+rule_str;
      }
      this.summary.querySelector("span").textContent = rule_str
    } else {
      this.summary.classList.add("fetching");
      this.save_button.classList.add("disabled");
      this.summary.querySelector("span").textContent = ""
      this.summaryFetch();
    }
  }

  summaryFetch() {
    if (!(this.current_rule.hash != null && this.current_rule.hash.rule_type != null)) { return; }
    this.current_rule.hash['week_start'] = this.config.texts["first_day_of_week"];

    let urlRoot = document.body.dataset.urlRoot;
    let url = `${urlRoot}/recurring_select/translate/${this.config.texts["locale_iso_code"]}`
    const headers = { 'X-Requested-With' : 'XMLHttpRequest', 'Content-Type' : 'application/x-www-form-urlencoded' }
    const body = serialize(this.current_rule.hash)
    console.log(this.current_rule.hash, body)

    fetch(url, { method: "POST", body, headers })
      .then(r => r.text())
      .then(this.summaryFetchSuccess)
  }

  summaryFetchSuccess(data) {
    this.current_rule.str = data
    this.summaryUpdate()
    css(this.content, { width: "auto" })
  }

  init_calendar_days(section) {
    const monthly_calendar = section.querySelector(".rs_calendar_day");
    monthly_calendar.innerHTML = "";
    for (let num = 1; num <= 31; num++) {
      const day_link = document.createElement("a")
      day_link.innerText = num
      monthly_calendar.appendChild(day_link)
      if (Array.from(this.current_rule.hash.validations.day_of_month).includes(num)) {
        day_link.classList.add("selected");
      }
    };

    // add last day of month button
    const end_of_month_link = document.createElement("a")
    end_of_month_link.innerText = this.config.texts["last_day"]
    monthly_calendar.appendChild(end_of_month_link);
    end_of_month_link.classList.add("end_of_month");
    if (Array.from(this.current_rule.hash.validations.day_of_month).includes(-1)) {
      end_of_month_link.classList.add("selected");
    }

    off(monthly_calendar, "click tap")
    on(monthly_calendar, "click tap", "a", this.dateOfMonthChanged)
  }

  init_calendar_weeks(section) {
    const monthly_calendar = section.querySelector(".rs_calendar_week")
    monthly_calendar.innerHTML = ""
    const row_labels = this.config.texts["order"];
    const show_row = this.config.options["monthly"]["show_week"];
    const cell_str = this.config.texts["days_first_letter"];

    const iterable = [1, 2, 3, 4, 5, -1]
    for (let index = 0; index < iterable.length; index++) {
      const num = iterable[index];
      if (show_row[index]) {
        const el = document.createElement("span")
        el.innerText = row_labels[index]
        monthly_calendar.appendChild(el);
        for (let i = this.config.texts["first_day_of_week"], day_of_week = i, end = 7 + this.config.texts["first_day_of_week"], asc = this.config.texts["first_day_of_week"] <= end; asc ? i < end : i > end; asc ? i++ : i--, day_of_week = i) {
          day_of_week = day_of_week % 7;
          const day_link = document.createElement("a")
          day_link.innerText = cell_str[day_of_week]
          day_link.setAttribute("day", day_of_week);
          day_link.setAttribute("instance", num);
          monthly_calendar.appendChild(day_link);
        };
      }
    };

    Object.entries(this.current_rule.hash.validations.day_of_week).forEach(([key, value]) => {
      Array.from(value).forEach((instance, index) => {
        section.querySelector(`a[day='${key}'][instance='${instance}']`).classList.add("selected")
      })
    })

    off(monthly_calendar, "click tap")
    on(monthly_calendar, "click tap", "a", this.weekOfMonthChanged)
  }

  toggle_month_view() {
    const week_mode = this.content.querySelector(".monthly_rule_type_week").checked
    if (week_mode) {
      this.content.querySelector(".rs_calendar_week").style.display = "block"
      this.content.querySelector(".rs_calendar_day").style.display = "none"
    } else {
      this.content.querySelector(".rs_calendar_week").style.display = "none"
      this.content.querySelector(".rs_calendar_day").style.display = "block"
    }
  }

// ========================= Change callbacks ===============================

  freqChanged() {
    if (!isPlainObject(this.current_rule.hash)) { this.current_rule.hash = null; } // for custom values

    if (!this.current_rule.hash) { this.current_rule.hash = {} };
    this.current_rule.hash.interval = 1;
    this.current_rule.hash.until = null;
    this.current_rule.hash.count = null;
    this.current_rule.hash.validations = null;
    this.content.querySelectorAll(".freq_option_section").forEach(el => el.style.display = 'none')
    this.content.querySelector("input[type=radio], input[type=checkbox]").checked = false
    switch (this.freq_select.value) {
      case "Weekly":
        this.current_rule.hash.rule_type = "IceCube::WeeklyRule";
        this.current_rule.str = this.config.texts["weekly"];
        this.initWeeklyOptions();
        break
      case "Monthly":
        this.current_rule.hash.rule_type = "IceCube::MonthlyRule";
        this.current_rule.str = this.config.texts["monthly"];
        this.initMonthlyOptions();
        break
      case "Yearly":
        this.current_rule.hash.rule_type = "IceCube::YearlyRule";
        this.current_rule.str = this.config.texts["yearly"];
        this.initYearlyOptions();
        break
      default:
        this.current_rule.hash.rule_type = "IceCube::DailyRule";
        this.current_rule.str = this.config.texts["daily"];
        this.initDailyOptions();
    };
    this.summaryUpdate();
  }

  intervalChanged(event) {
    this.current_rule.str = null;
    if (!this.current_rule.hash) { this.current_rule.hash = {} };
    this.current_rule.hash.interval = parseInt(event.currentTarget.value);
    if ((this.current_rule.hash.interval < 1) || isNaN(this.current_rule.hash.interval)) {
      this.current_rule.hash.interval = 1;
    }
    this.summaryUpdate();
  }

  daysChanged(event) {
    event.target.classList.toggle("selected");
    this.current_rule.str = null;
    if (!this.current_rule.hash) { this.current_rule.hash = {} };
    this.current_rule.hash.validations = {};
    const raw_days = Array.from(this.content.querySelectorAll(".day_holder a.selected"))
      .map(el => parseInt(el.dataset.value))
    this.current_rule.hash.validations.day = raw_days
    this.summaryUpdate();
    return false;
  }

  dateOfMonthChanged(event) {
    event.target.classList.toggle("selected");
    this.current_rule.str = null;
    if (!this.current_rule.hash) { this.current_rule.hash = {} };
    this.current_rule.hash.validations = {};
    const raw_days = Array.from(this.content.querySelectorAll(".monthly_options .rs_calendar_day a.selected"))
      .map(el => {
        return el.innerText === this.config.texts["last_day"] ? -1 : parseInt(el.innerText)
      })
    this.current_rule.hash.validations.day_of_week = {};
    this.current_rule.hash.validations.day_of_month = raw_days;
    this.summaryUpdate();
    return false;
  }

  weekOfMonthChanged(event) {
    event.target.classList.toggle("selected");
    this.current_rule.str = null;
    if (!this.current_rule.hash) { this.current_rule.hash = {} };
    this.current_rule.hash.validations = {};
    this.current_rule.hash.validations.day_of_month = [];
    this.current_rule.hash.validations.day_of_week = {};
    this.content.querySelectorAll(".monthly_options .rs_calendar_week a.selected")
      .forEach((elm, index) => {
        const day = parseInt(elm.getAttribute("day"));
        const instance = parseInt(elm.getAttribute("instance"));
        if (!this.current_rule.hash.validations.day_of_week[day]) { this.current_rule.hash.validations.day_of_week[day] = [] };
        return this.current_rule.hash.validations.day_of_week[day].push(instance);
      })
    this.summaryUpdate();
    return false;
  }

// ========================= Change callbacks ===============================

  template() {
    let str = `\
    <div class='rs_dialog_holder'> \
      <div class='rs_dialog'> \
        <div class='rs_dialog_content'> \
          <h1>${this.config.texts["repeat"]} <a href='javascript:void(0)' title='${this.config.texts["cancel"]}' alt='${this.config.texts["cancel"]}'></a> </h1> \
          <p class='frequency-select-wrapper'> \
            <label for='rs_frequency'>${this.config.texts["frequency"]}:</label> \
            <select data-wrapper-class='ui-recurring-select' id='rs_frequency' class='rs_frequency' name='rs_frequency'> \
              <option value='Daily'>${this.config.texts["daily"]}</option> \
              <option value='Weekly'>${this.config.texts["weekly"]}</option> \
              <option value='Monthly'>${this.config.texts["monthly"]}</option> \
              <option value='Yearly'>${this.config.texts["yearly"]}</option> \
            </select> \
          </p> \
          \
          <div class='daily_options freq_option_section'> \
            <p> \
              ${this.config.texts["every"]} \
              <input type='text' data-wrapper-class='ui-recurring-select' name='rs_daily_interval' class='rs_daily_interval rs_interval' value='1' size='2' /> \
              ${this.config.texts["days"]} \
            </p> \
          </div> \
          <div class='weekly_options freq_option_section'> \
            <p> \
              ${this.config.texts["every"]} \
              <input type='text' data-wrapper-class='ui-recurring-select' name='rs_weekly_interval' class='rs_weekly_interval rs_interval' value='1' size='2' /> \
              ${this.config.texts["weeks_on"]}: \
            </p> \
            <div class='day_holder'>\
              `;
              for (let i = this.config.texts["first_day_of_week"], day_of_week = i, end = 7 + this.config.texts["first_day_of_week"], asc = this.config.texts["first_day_of_week"] <= end; asc ? i < end : i > end; asc ? i++ : i--, day_of_week = i) {
                day_of_week = day_of_week % 7;
                str += `<a href='#' data-value='${day_of_week}'>${this.config.texts["days_first_letter"][day_of_week]}</a>`;
              };

              str += `\
            </div> \
            <span style='clear:both; visibility:hidden; height:1px;'>.</span> \
          </div> \
          <div class='monthly_options freq_option_section'> \
            <p> \
              ${this.config.texts["every"]} \
              <input type='text' data-wrapper-class='ui-recurring-select' name='rs_monthly_interval' class='rs_monthly_interval rs_interval' value='1' size='2' /> \
              ${this.config.texts["months"]}: \
            </p> \
            <p class='monthly_rule_type'> \
              <span><label for='monthly_rule_type_day'>${this.config.texts["day_of_month"]}</label><input type='radio' class='monthly_rule_type_day' name='monthly_rule_type' id='monthly_rule_type_day' value='true' /></span> \
              <span><label for='monthly_rule_type_week'>${this.config.texts["day_of_week"]}</label><input type='radio' class='monthly_rule_type_week' name='monthly_rule_type' id='monthly_rule_type_week' value='true' /></span> \
            </p> \
            <p class='rs_calendar_day'></p> \
            <p class='rs_calendar_week'></p> \
          </div> \
          <div class='yearly_options freq_option_section'> \
            <p> \
              ${this.config.texts["every"]} \
              <input type='text' data-wrapper-class='ui-recurring-select' name='rs_yearly_interval' class='rs_yearly_interval rs_interval' value='1' size='2' /> \
              ${this.config.texts["years"]} \
            </p> \
          </div> \
          <p class='rs_summary'> \
            <span></span> \
          </p> \
          <div class='controls'> \
            <input type='button' data-wrapper-class='ui-recurring-select' class='rs_save' value='${this.config.texts["ok"]}' /> \
            <input type='button' data-wrapper-class='ui-recurring-select' class='rs_cancel' value='${this.config.texts["cancel"]}' /> \
          </div> \
        </div> \
      </div> \
    </div>\
    `;

    return str;
  }
}
