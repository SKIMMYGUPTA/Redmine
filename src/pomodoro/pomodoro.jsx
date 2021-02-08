import React from "react";
import Mousetrap from "mousetrap";
import "./style.css";
import audio from "./songs/alarm.mp3";
import Footer from "./Footer";
import koders from "./img/koders.png";
const { ipcRenderer } = window.require("electron");

export default class Pomodoro extends React.Component {
    constructor() {
        super();
        this.state = {
            time: 0,
            play: false,
            timeType: 0,
            title: "",
            work: "",
            value: "",
        };
        // Bind early, avoid function creation on render loop
        this.setTimeForCode = this.setTime.bind(this, 1500);
        this.setTimeForSocial = this.setTime.bind(this, 1200);
        this.setTimeForCoffee = this.setTime.bind(this, 300);
        this.reset = this.reset.bind(this);
        this.play = this.play.bind(this);
        this.alert = this.alert.bind(this);
        this.elapseTime = this.elapseTime.bind(this);
    }

    componentDidMount() {
        this.setDefaultTime();
        this.startShortcuts();
        Notification.requestPermission();
    }
    getTitle(time) {
        time = typeof time === "undefined" ? this.state.time : time;
        let _title = this.format(time) + " | Pomodoro timer";
        return _title;
    }

    setDefaultTime() {
        let defaultTime = 1500;
        this.setState({
            time: defaultTime,
            timeType: defaultTime,
            title: this.getTitle(defaultTime),
            play: false,
        });
    }

    elapseTime() {
        if (this.state.time === 0) {
            this.reset(0);
            this.alert();
        }
        if (this.state.play === true) {
            let newState = this.state.time - 1;
            this.setState({ time: newState, title: this.getTitle(newState) });
        }
    }

    format(seconds) {
        let m = Math.floor((seconds % 3600) / 60);
        let s = Math.floor((seconds % 3600) % 60);
        let timeFormated =
            (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
        return timeFormated;
    }

    getFormatTypes() {
        const work = this.state.work ? `Working On ${this.state.work}` : "Work";
        return [
            { type: work, time: 1500 },
            { type: "In a Meeting", time: 1200 },
            { type: "On a Break", time: 300 },
        ];
    }

    formatType(timeType) {
        let timeTypes = this.getFormatTypes();
        for (let i = 0; i < timeTypes.length; i++) {
            let timeObj = timeTypes[i];
            if (timeObj.time === timeType) {
                return timeObj.type;
            }
        }
        return null;
    }

    restartInterval() {
        clearInterval(this.interval);
        this.interval = setInterval(this.elapseTime, 1000);
    }

    play() {
        if (!this.state.value) {
            alert("Please enter Title");
            return;
        }
        if (true === this.state.play) return;

        this.restartInterval();

        this.setState({
            play: true,
        });
    }

    reset(resetFor = this.state.time) {
        clearInterval(this.interval);
        this.format(resetFor);
        this.setState({ play: false });
    }

    togglePlay() {
        if (true === this.state.play) return this.reset();

        return this.play();
    }

    setTime(newTime) {
        this.restartInterval();
        this.setState({
            time: newTime,
            timeType: newTime,
            title: this.getTitle(newTime),
            play: false,
            value: "",
        });
    }

    startShortcuts() {
        Mousetrap.bind("space", this.togglePlay.bind(this));
        Mousetrap.bind(
            ["ctrl+left", "meta+left"],
            this.toggleMode.bind(this, -1)
        );
        Mousetrap.bind(
            ["ctrl+right", "meta+right"],
            this.toggleMode.bind(this, 1)
        );
    }

    toggleMode(gotoDirection) {
        let timeTypes = this.getFormatTypes();
        let currentPosition = -1;

        for (let i = 0; i < timeTypes.length; i++) {
            if (timeTypes[i].time === this.state.timeType) {
                currentPosition = i;
                break;
            }
        }

        if (currentPosition !== -1) {
            let newMode = timeTypes[currentPosition + gotoDirection];
            if (newMode) this.setTime(newMode.time);
        }
    }

    _setLocalStorage(item, element) {
        let value = element.target.checked;
        localStorage.setItem("react-pomodoro-" + item, value);
    }

    _getLocalStorage(item) {
        return localStorage.getItem("react-pomodoro-" + item) === "true"
            ? true
            : false;
    }
    countMinutes = (totalTime, currTime) => {
        const ct = currTime.split(":");
        const totalsec = parseInt(ct[0]) * 60 + parseInt(ct[1]);
        const restSec = totalTime - totalsec;
        if (restSec < 60) {
            if (restSec < 10) {
                return "00:0" + restSec;
            }
            return "00:" + restSec;
        } else {
            let mints = parseInt(restSec / 60);
            let sec = restSec - mints * 60;
            if (mints < 10) {
                mints = "0" + mints;
            }
            if (sec < 10) {
                sec = "0" + sec;
            }
            return mints + ":" + sec;
        }
    };

    async alert() {
        if (!this.state.value) {
            alert("Please Enter Title");
            return;
        }
        // audio
        let aud = new Audio(audio);
        aud.play();
        setTimeout(() => aud.pause(), 1400);
        const data = {
            content: this.state.value,
            title: this.formatType(this.state.timeType),
        };

        // notification
        if (this.state.timeType === 1500) {
            new Notification("The time is over!", {
                icon: koders,
                lang: "en",
                body: "Hey, Let's get back to Work.",
            });
            data.timer = this.countMinutes(1500, this.format(this.state.time));
            this.setTimeForCoffee();
        } else if (this.state.timeType === 1200) {
            new Notification("Relax :)", {
                icon: koders,
                lang: "en",
                body: "Meeting timer is over.",
            });
            data.timer = this.countMinutes(1200, this.format(this.state.time));
        } else {
            new Notification("Relax :)", {
                icon: koders,
                lang: "en",
                body: "Break timer is over.",
            });
            data.timer = this.countMinutes(300, this.format(this.state.time));
        }
        ipcRenderer.send("webhook", data);
        this.setDefaultTime();
    }
    handleChange = (e) => {
        this.setTimeForCode();
        this.setState({ work: e.target.value });
    };
    handleChangeInput = (e) => {
        this.setState({ value: e.target.value });
    };
    render() {
        return (
            <div className="pomodoro">
                <div className="main">
                    <div className="content display timer">
                        <span className="time">
                            <h1>Time Tracker</h1>
                            {this.format(this.state.time)}
                        </span>
                        <span className="timeType">
                            {this.formatType(this.state.timeType)}
                            <div className="row d-flex justify-content-center">
                                <input
                                    className="form-control col-5 col-sm-3 col-md-4  input"
                                    placeholder="Title"
                                    value={this.state.value}
                                    onChange={this.handleChangeInput}
                                />
                            </div>
                        </span>
                    </div>
                    <div className="content display">
                        <select
                            className="col-2 form-control form-select sel"
                            aria-label="Default select example"
                            onChange={this.handleChange}>
                            <option defaultValue>Work</option>
                            <option value="Development">Development</option>
                            <option value="Designing">Designing</option>
                            <option value="Content Creation">
                                Content Creation
                            </option>
                            <option value="Marketing">Marketing</option>
                            <option value="Planning">Planning</option>
                            <option value="Management">Management</option>
                        </select>
                        <button
                            className="btn btn-primary col-2 ml-2"
                            onClick={this.setTimeForSocial}>
                            Meetings
                        </button>
                        <button
                            className="btn btn-primary col-2 ml-2"
                            onClick={this.setTimeForCoffee}>
                            Break
                        </button>
                    </div>
                    <div className="content">
                        <i
                            className="fa fa-play-circle fa-5x btnIcon"
                            aria-hidden="true"
                            onClick={this.play}></i>
                        <i
                            className="fa fa-pause-circle fa-5x btnIcon"
                            aria-hidden="true"
                            onClick={this.reset}></i>
                        <i
                            className="fa fa-stop-circle fa-5x btnIcon"
                            aria-hidden="true"
                            onClick={this.alert}></i>
                    </div>
                </div>
                <div className="bottomBar">
                    <Footer />
                </div>
            </div>
        );
    }
}
