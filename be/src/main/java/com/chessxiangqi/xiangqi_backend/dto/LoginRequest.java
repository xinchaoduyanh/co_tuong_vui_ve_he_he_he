// src/main/java/com/chessxiangqi/xiangqi_backend/dto/LoginRequest.java
package com.chessxiangqi.xiangqi_backend.dto;

import lombok.Data;

@Data
public class LoginRequest {
    private String username;
    private String password;
}