const express = require('express')
const app = express()

const cors = require('cors');                           //서버간 통신 모듈
app.use(cors())


const bodyParser = require('body-parser')
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: true}))        //extended: true -> qs라이브러리로 중첩 허용, 중첩을 허용해야하나? 아니지 않나


const PORT = 8080
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

const database = require('./database/index')            //데이터베이스 파일 경로

//로그인 필요 없음
//회원가입 필요 없음

app.post('/user/login', (req, res) => {
    const id = req.body.id                         //로그인시 아이디
    const pw = req.body.pw                //로그인시 비밀번호

    database.login(id, pw, (data, cookie) => {
        database.setSession(data.id, cookie)
        res.json({
            ok: true,
            name: data.name,
            id: data.id,
            cookie: cookie
        })

    },
    (err) => {
        res.status(400).json({
            ok: false,
            err: err
        })
    })
    
})

app.post('/user/qr', (req,res) => {                     //qr코드 발급
    const id = req.body.id
    if (!id) {
        res.json({
            ok: false,
            err: 'id is required'
        })
        return
    }

    const session = req.query.session
    if (session != database.getSession(id) && session) {
        res.status(401).json({
            ok: false,
            err: 'incorrect Session'
        })
        return
    }

    database.getMID(session.Cookie, (mid) => {
        database.getQR(mid, session.Cookie, (QR) => {
            res.json({
                ok: true,
                QR: QR
            })
        },
        (err) => {
            res.json({
                ok: false,
                err: err
            })
        })
    },
    (err) => {
        res.json({
            ok: false,
            err: err
        })
    })
})

app.get('/user/qr/check', (req, res) => {           //qr 확인
    const id = req.query.id
    const session = req.query.session
    if (session != database.getSession(id) && session) {
        res.status(401).json({
            ok: false,
            err: 'incorrect Session'
        })
        return
    }

    const data = database.getQR(id)
    if (data.length == 0) {                         //qr이 발급되지 않은 상태
        res.status(404)
    }
    else {
        let qr = data[0]
        res.json(qr)
    }
})

app.get('/user/seat', (req, res) => {                   //예약한 자리 정보 확인
    const id = req.query.id
    const session = req.query.session
    if (session != database.getSession(id) && session) {
        res.status(401).json({
            ok: false,
            err: 'incorrect Session'
        })
        return
    }
    const data = database.getSeatById(id)
    if(data.length == 0) {                          //예약한 자리가 없는 상태
        res.status(404).json({
            ok: false,
            err: 'No reserved seat'
        })
        return
    }

    res.json(data)
    
})

//자리 예약할 때 시간을 어떻게 처리할지 잘 모르겠음

app.put('/user/reserve', (req,res) => {                 //자리 예약, 예약x -> 예약o
    const id = req.query.id
    const session = req.query.session
    if (session != database.getSession(id) && session) {
        res.status(401).json({
            ok: false,
            err: 'incorrect Session'
        })
        return
    }
    if(database.getSeatById(id).length != 0) {      //이미 예약한 자리 존재
        res.status(400)
    }
    else {
        const seatNumber = req.body.seatNumber
        if(database.getSeatBySeatNumber(seatNumber).reservedTime != null) {   //다른 사람이 예약중인 좌석
            res.json({
                ok: false,
                err: 'already reserved seat'
            })
            return
        }

        const reservedTime = req.body.reservedTime
        const time = req.body.time
        database.reserveSeat(seatNumber,id,reservedTime,time)       //잘 모르겠는 부분
        res.json({
            ok: true
        })
    }
})

app.put('/user/reserve/off', (req, res) => {                //자리 예약, 예약 o -> 예약 x
    const id = req.query.id
    const session = req.query.session
    if (session != database.getSession(id) && session) {
        res.status(401).json({
            ok: false,
            err: 'incorrect Session'
        })
        return
    }
    const data = database.getSeatById(id)

    if (data.length == 0) {                          //예약한 자리 없음
        res.status(404).json({
            ok: false,
            err: 'No reservation found for the given id'
        })
        return
    }

    //예약된 좌석을 취소
    database.deleteSeat(data)

    res.json({
        ok: true,
        message: 'Reservation cancelled',
        data: data //취소된 좌석 정보
    })
})

app.put('/seats/time/add', (req, res) => {                  //시간 연장
    const id = req.query.id
    const session = req.query.session
    if (session != database.getSession(id) && session) {
        res.status(401).json({
            ok: false,
            err: 'incorrect Session'
        })
        return
    }
    const data = database.getSeatById(id)

    if (data.addCount == 0) {                       //연장 가능 횟수가 남아있지 않음
        res.status(403).json({
            ok: false,
            err: 'No time extension left'
        })
        return
    }
    const time = req.body.addTime                   //얼마나 연장할건지
    let newAddCount = data.addCount - 1           //연장 가능 횟수 차감
    database.addTime(data,time,newAddCount)

    res.json({
        ok: true,
        message: 'extension time successfully'
    })
})

app.post('/seats/reserve/reserve', (req,res) => {           //예약의 예약 추가
    const id = req.query.id
    const session = req.query.session
    if (session != database.getSession(id) && session) {
        res.status(401).json({
            ok: false,
            err: 'incorrect Session'
        })
        return
    }
    const seatNumber = req.body.seatNumber
    database.getSeatBySeatNumber(seatNumber)[reserveReserve].append(id)     //seat DB의 reserveReserve키의 벨류값은 리스트

    res.json({
        ok: true,
        message: 'add reserve reserve successfully'
    })
})