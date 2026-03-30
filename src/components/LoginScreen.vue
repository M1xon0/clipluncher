<template>
  <div class="login-screen">
    <h1>Login</h1>
    <input type="text" placeholder="Username" />
    <input type="password" placeholder="Password" />
    <button>Login</button>
  </div>
</template>

<script>
export default {
  name: 'LoginScreen',
};
</script>

<style scoped>
.login-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background-color: rgba(255, 50, 200, 0.3);
  color: #32ff96;
  font-family: 'Press Start 2P', cursive;
}

button {
  background-color: #32ff96;
  color: black;
  border: none;
  padding: 10px 20px;
  cursor: pointer;
  font-family: 'Press Start 2P', cursive;
}
</style>