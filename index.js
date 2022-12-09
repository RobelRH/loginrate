import express, { json } from "express";
import fs from 'fs'

const app = express()

app.use(json())
app.use(express.urlencoded({ extended: true }))

// this function loads json file if it exists
// if it does not exist it will create and load file
function loadJson(filename = '') {
    if (fs.existsSync(filename)) {
        return JSON.parse(fs.readFileSync(filename).toString())
    }
    else {
        fs.writeFileSync(filename, '[]')
        return JSON.parse(fs.readFileSync(filename).toString())
    }
}

// this function writes json data into a file
function saveJson(filename = '', json) {
    return fs.writeFileSync(filename, JSON.stringify(json))
}

// No individual IP could submit the login form more than
// 5 times in 1 minute or 15 times in 1 hour
function attemptIPCounter(clientIP, res) {

    let currentTimeStamp = Date.now()

    const ipRecord = loadJson("ipRecord.json");
    let getExistingIp = false;

    for (let i = 0; i < ipRecord.length; i++) {
        // if ip exist in the file update total and other staffs.
        if (ipRecord[i].clientIP == clientIP) {
            getExistingIp = true;

            // this will give us the elapsed time
            let elapsedTimeHour = (currentTimeStamp - ipRecord[i].initialAttempt) / 1000
            let elapsedTimeMin = (currentTimeStamp - ipRecord[i].finalAttempt) / 1000
            let totalAttempt = ipRecord[i].total
            // if you try 5 times in 1 minute
            if (elapsedTimeMin < 60 && totalAttempt >= 5 && totalAttempt < 15 && ipRecord[i].tempCount >= 5) {
                ipRecord[i].total += 1
                ipRecord[i].tempCount += 1
                ipRecord[i].finalAttempt = currentTimeStamp
                saveJson("ipRecord.json", ipRecord)
                return res.json({ success: false, "message": "total limit reached - maximum allowed 5 times per minute" })
            }
            // if you try 15 times in 1 hour
            else if (elapsedTimeHour < 3600 && totalAttempt == 15) {
                return res.json({ success: false, "message": "total limit reached - maximum allowed 15 times per hour" })
            }
            // if 1 hour passed reset time
            else if (elapsedTimeHour > 3600) {
                ipRecord[i].total = 1
                ipRecord[i].initialAttempt = currentTimeStamp
                ipRecord[i].finalAttempt = currentTimeStamp
                saveJson("ipRecord.json", ipRecord)
                return res.json({ success: true, "message": "attempt ip passed / allowed" })
            }
            // update total attempt of specific ip address
            else {
                if (elapsedTimeMin > 60) {
                    ipRecord[i].tempCount = 1
                }
                else {
                    ipRecord[i].tempCount += 1
                }

                ipRecord[i].total += 1
                ipRecord[i].finalAttempt = currentTimeStamp
                saveJson("ipRecord.json", ipRecord)
                return res.json({ success: true, "message": "attempt ip passed / allowed" })
            }
        }
    }

    // if no ip found on the record list push it into the file
    if (!getExistingIp) {
        ipRecord.push({ clientIP: clientIP, initialAttempt: currentTimeStamp, finalAttempt: currentTimeStamp, total: 1, tempCount: 1 })
        saveJson("ipRecord.json", ipRecord)
        return res.json({ success: true, "message": "attempt ip passed / allowed" })
    }

}

function attemptCookieCounter(cookieId, res) {

    if (cookieId != null) {

        let currentTimeStamp = Date.now()

        const cookieRecord = loadJson("cookieRecord.json");
        let getExistingCookie = false;

        for (let i = 0; i < cookieRecord.length; i++) {
            // if cookie exist in the file update total and other staffs.
            if (cookieRecord[i].cookieId == cookieId) {
                getExistingCookie = true;

                // this will give us the elapsed time
                let elapsedTimeSec = (currentTimeStamp - cookieRecord[i].initialAttempt) / 1000
                let totalAttempt = cookieRecord[i].total

                if (elapsedTimeSec < 10 && totalAttempt >= 2) {
                    return res.json({ success: false, "message": "total limit reached - maximum allowed 2 times per 10 second" })
                }
                else if (elapsedTimeSec > 10) {
                    cookieRecord[i].total = 1
                    cookieRecord[i].initialAttempt = currentTimeStamp
                    saveJson("cookieRecord.json", cookieRecord)
                    return res.json({ success: true, "message": "attempt cookie id passed / allowed" })
                }
                // update total attempt of specific cookie id
                else {
                    cookieRecord[i].total += 1
                    saveJson("cookieRecord.json", cookieRecord)
                    return res.json({ success: true, "message": "attempt cookie id passed / allowed" })
                }
            }
        }

        // if no ip found on the record list push it into the file
        if (!getExistingCookie) {
            cookieRecord.push({ cookieId: cookieId, initialAttempt: currentTimeStamp, total: 1 })
            saveJson("cookieRecord.json", cookieRecord)
            return res.json({ success: true, "message": "attempt cookie id passed / allowed" })
        }
    }
}

function attemptUsernameCounter(username, clientIP, res) {

    let currentTimeStamp = Date.now()

    const usernameRecord = loadJson("usernameRecord.json");
    let getExistingUsername = false;

    for (let i = 0; i < usernameRecord.length; i++) {
        // if cookie exist in the file update total and other staffs.
        if (usernameRecord[i].username == username && usernameRecord[i].clientIP == clientIP) {
            getExistingUsername = true;

            // this will give us the elapsed time
            let elapsedTimeSec = (currentTimeStamp - usernameRecord[i].initialAttempt) / 1000
            let totalAttempt = usernameRecord[i].total

            if (elapsedTimeSec < 3600 && totalAttempt >= 10) {
                return res.json({ success: false, "message": "total limit reached - maximum allowed 10 times per hour" })
            }
            else if (elapsedTimeSec > 3600) {
                usernameRecord[i].total = 1
                usernameRecord[i].initialAttempt = currentTimeStamp
                saveJson("usernameRecord.json", usernameRecord)
                return res.json({ success: true, "message": "attempt username passed / allowed" })
            }
            // update total attempt of specific cookie id
            else {
                usernameRecord[i].total += 1
                saveJson("usernameRecord.json", usernameRecord)
                return res.json({ success: true, "message": "attempt username passed / allowed" })
            }
        }
    }

    // if no ip found on the record list push it into the file
    if (!getExistingUsername) {
        usernameRecord.push({ username: username, clientIP: clientIP, initialAttempt: currentTimeStamp, total: 1 })
        saveJson("usernameRecord.json", usernameRecord)
        return res.json({ success: true, "message": "attempt username passed / allowed" })
    }

}

function loginRateLimiter(clientIP, cookieId = null, username, res) {
    // attemptIPCounter(clientIP, res)
    // attemptCookieCounter(cookieId, res);
    attemptUsernameCounter(username, clientIP, res);
}

app.post('/', (req, res) => {
    var ip = req.body.ip;
    var cookieId = req.body.cookieId;
    var username = req.body.username;

    loginRateLimiter(ip, cookieId, username, res)
})

const port = 5000

app.listen(port, () => console.log(`server running on port ${port}`))