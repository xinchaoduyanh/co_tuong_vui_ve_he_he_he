// src/main/java/com/chessxiangqi/xiangqi_backend/dto/RegisterRequest.java
package com.chessxiangqi.xiangqi_backend.dto;

import lombok.Data;

@Data
public class RegisterRequest {
    private String username;
    private String password;
}