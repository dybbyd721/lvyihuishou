const express = require('express');
const cors = require('cors');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync'); // 修复点：这里之前写错了

const app = express();
app.use(cors());
app.use(express.json());

const adapter = new FileSync('db.json');
const db = low(adapter);
db.defaults({
  users: [],
  staff: [],
  codes: {},
  orders: []
}).write();

// 生成ID
function genId() {
  return Date.now() + '';
}

// 发送验证码
app.post('/api/sendCode', (req, res) => {
  const { phone } = req.body;
  const code = '123456';
  db.set('codes.' + phone, code).write();
  console.log('手机号', phone, '验证码', code);
  res.json({ ok: true, msg: '验证码：123456（测试用）' });
});

// 用户注册
app.post('/api/registerUser', (req, res) => {
  const { phone, password, code } = req.body;
  const realCode = db.get('codes.' + phone).value();

  if (!realCode || realCode !== code) {
    return res.json({ ok: false, msg: '验证码错误' });
  }
  if (db.get('users').find({ phone }).value()) {
    return res.json({ ok: false, msg: '手机号已注册' });
  }

  const user = {
    id: genId(),
    phone,
    password,
    nickname: '用户' + phone.slice(-4),
    point: 0
  };
  db.get('users').push(user).write();
  res.json({ ok: true, msg: '用户注册成功' });
});

// 回收员注册（自动工号 001起）
app.post('/api/registerStaff', (req, res) => {
  const { phone, password, code } = req.body;
  const realCode = db.get('codes.' + phone).value();

  if (!realCode || realCode !== code) {
    return res.json({ ok: false, msg: '验证码错误' });
  }
  if (db.get('staff').find({ phone }).value()) {
    return res.json({ ok: false, msg: '该手机号已注册回收员' });
  }

  const staffList = db.get('staff').value();
  let workId;
  if (staffList.length === 0) {
    workId = '001';
  } else {
    const maxNum = Math.max(...staffList.map(s => parseInt(s.workId) || 0));
    workId = (maxNum + 1).toString().padStart(3, '0');
  }

  const staff = {
    id: genId(),
    phone,
    password,
    workId,
    nickname: '回收员' + phone.slice(-4)
  };
  db.get('staff').push(staff).write();
  res.json({ ok: true, msg: '回收员注册成功，工号：' + workId });
});

// 用户登录（支持测试账号 admin）
app.post('/api/loginUser', (req, res) => {
  const { phone, password } = req.body;

  // 测试账号通用
  if (phone === 'admin' && password === '123456') {
    return res.json({
      ok: true,
      role: 'user',
      data: { id: '999', phone: 'admin', nickname: '管理员(用户)', point: 9999 }
    });
  }

  const user = db.get('users').find({ phone, password }).value();
  if (!user) {
    return res.json({ ok: false, msg: '账号或密码错误' });
  }

  res.json({
    ok: true,
    role: 'user',
    data: { id: user.id, phone: user.phone, nickname: user.nickname, point: user.point }
  });
});

// 回收员登录（支持测试账号 admin，工号 000）
app.post('/api/loginStaff', (req, res) => {
  const { phone, password } = req.body;

  // 测试账号 admin → 回收员，工号 000
  if (phone === 'admin' && password === '123456') {
    return res.json({
      ok: true,
      role: 'staff',
      data: { id: '999', phone: 'admin', nickname: '管理员(回收员)', workId: '000' }
    });
  }

  const staff = db.get('staff').find({ phone, password }).value();
  if (!staff) {
    return res.json({ ok: false, msg: '账号或密码错误' });
  }

  res.json({
    ok: true,
    role: 'staff',
    data: { id: staff.id, phone: staff.phone, nickname: staff.nickname, workId: staff.workId }
  });
});

// 启动
app.listen(3666, () => {
  console.log('✅ 后端已启动：http://localhost:3666');
});
